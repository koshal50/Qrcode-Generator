import * as vscode from "vscode";
import { exec, execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

/**
 * Discovers the best Python executable available on the system.
 * Checks workspace venv first, then system Python.
 */
function findPython(): string {
  const isWin = process.platform === "win32";

  // 1. Check workspace venv
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders) {
    for (const folder of workspaceFolders) {
      const venvPython = isWin
        ? path.join(folder.uri.fsPath, "venv", "Scripts", "python.exe")
        : path.join(folder.uri.fsPath, "venv", "bin", "python");

      if (fs.existsSync(venvPython)) {
        return `"${venvPython}"`;
      }

      // Also check .venv
      const dotVenvPython = isWin
        ? path.join(folder.uri.fsPath, ".venv", "Scripts", "python.exe")
        : path.join(folder.uri.fsPath, ".venv", "bin", "python");

      if (fs.existsSync(dotVenvPython)) {
        return `"${dotVenvPython}"`;
      }
    }
  }

  // 2. Fall back to system python
  return isWin ? "python" : "python3";
}

/**
 * Run a shell command and return stdout, or null on failure.
 */
function tryExec(cmd: string, timeoutMs = 15000): string | null {
  try {
    const output = execSync(cmd, {
      timeout: timeoutMs,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return output;
  } catch {
    return null;
  }
}

export class QRGenRunner {
  private pythonPath: string = "";

  /**
   * Check if the qrgen package is importable by the discovered Python.
   * This is more reliable than checking if "qrgen" is on PATH, because
   * the console_scripts entry point may not be on the shell PATH that
   * child_process.exec sees — especially inside venvs.
   */
  async checkCLI(): Promise<boolean> {
    const python = findPython();
    this.pythonPath = python;

    // Try importing the package — this works regardless of PATH issues
    const result = tryExec(
      `${python} -c "import qrgen; print(qrgen.__version__)"`,
      10000
    );
    return result !== null;
  }

  /**
   * Show a modal dialog previewing the dependencies that will be installed.
   * Returns true if the user clicks "Install".
   */
  async showDependencyPreview(): Promise<boolean> {
    const message = [
      "QRGen CLI is not installed.",
      "",
      "The following Python packages will be installed:",
      "• qrcode (QR generation)",
      "• Pillow (image processing)",
      "• colorama (colored output)",
      "",
      "Requirement: Python 3.9+",
    ].join("\n");

    const choice = await vscode.window.showInformationMessage(
      message,
      { modal: true },
      "Install",
      "Cancel"
    );

    return choice === "Install";
  }

  /**
   * Install the CLI package and wait for completion.
   * Returns true if the install succeeded.
   */
  async installCLI(): Promise<boolean> {
    const installSource = this.resolveInstallSource();

    // Show progress while installing
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "QRGen: Installing dependencies...",
        cancellable: false,
      },
      async () => {
        return new Promise<boolean>((resolve) => {
          exec(installSource, { timeout: 120000 }, (error, stdout, stderr) => {
            if (error) {
              const errMsg =
                stderr?.trim() || stdout?.trim() || error.message;
              vscode.window.showErrorMessage(
                `QRGen install failed: ${errMsg}`
              );
              resolve(false);
              return;
            }
            resolve(true);
          });
        });
      }
    );
  }

  /**
   * Run the qrgen CLI to generate a QR code.
   * Uses `python -m qrgen.cli` for reliability — avoids PATH issues.
   * Returns the absolute path to the generated image.
   */
  async generate(data: string, outputDir?: string): Promise<string> {
    const timestamp = Date.now();
    const filename = `qrcode_${timestamp}.png`;
    const python = this.pythonPath || findPython();

    // Build command using python -m so we don't depend on PATH
    let cmd = `${python} -m qrgen "${data}" -o "${filename}"`;
    if (outputDir) {
      cmd += ` -d "${outputDir}"`;
    }

    return new Promise((resolve, reject) => {
      exec(cmd, { timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
          const errMsg =
            stderr?.trim() || stdout?.trim() || error.message;
          reject(new Error(errMsg));
          return;
        }

        // Parse the output to find the file path
        // CLI outputs: "QR code saved -> <path>"
        const output = stdout.trim();
        // Strip ALL ANSI escape codes first
        const cleanOutput = output.replace(
          // eslint-disable-next-line no-control-regex
          /\x1b\[[0-9;]*[A-Za-z]/g,
          ""
        );
        const match = cleanOutput.match(/saved\s*->\s*(.+)/i);

        if (match && match[1]) {
          const cleanPath = match[1].trim();
          // Verify the file actually exists
          if (fs.existsSync(cleanPath)) {
            resolve(cleanPath);
            return;
          }
        }

        // Fallback: construct the expected path
        if (outputDir) {
          const fallbackPath = path.join(outputDir, filename);
          if (fs.existsSync(fallbackPath)) {
            resolve(fallbackPath);
            return;
          }
        }

        // Last resort: check CWD/output
        const cwdFallback = path.join(
          outputDir || process.cwd(),
          "output",
          filename
        );
        if (fs.existsSync(cwdFallback)) {
          resolve(cwdFallback);
          return;
        }

        reject(
          new Error(
            `QR code was generated but the file could not be located.\nCLI output: ${cleanOutput}`
          )
        );
      });
    });
  }

  /**
   * Determine the best install command.
   *
   * Priority:
   * 1. Local workspace — if pyproject.toml with qrgen is found, install from there
   * 2. GitHub repo — fallback to installing from the remote repo
   *
   * Always uses the discovered Python's pip to avoid PATH issues.
   */
  private resolveInstallSource(): string {
    const python = this.pythonPath || findPython();
    const pipCmd = `${python} -m pip`;

    // Check if the current workspace contains the qrgen package
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
      for (const folder of workspaceFolders) {
        const pyprojectPath = path.join(folder.uri.fsPath, "pyproject.toml");
        const qrgenPackagePath = path.join(folder.uri.fsPath, "qrgen");

        if (fs.existsSync(pyprojectPath) && fs.existsSync(qrgenPackagePath)) {
          return `${pipCmd} install -e "${folder.uri.fsPath}"`;
        }
      }
    }

    // Fallback: install from GitHub
    return `${pipCmd} install git+https://github.com/koshal50/Qrcode-Generator.git`;
  }
}
