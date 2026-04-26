import * as vscode from "vscode";
import { exec, execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

const IS_WIN = process.platform === "win32";

/**
 * Discovers the best Python executable available on the system.
 * Checks workspace venv first, then system Python.
 */
function findPython(): string {
  // 1. Check workspace venv
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders) {
    for (const folder of workspaceFolders) {
      for (const venvName of ["venv", ".venv"]) {
        const venvPython = IS_WIN
          ? path.join(folder.uri.fsPath, venvName, "Scripts", "python.exe")
          : path.join(folder.uri.fsPath, venvName, "bin", "python");

        if (fs.existsSync(venvPython)) {
          return venvPython;
        }
      }
    }
  }

  // 2. Fall back to system python
  return IS_WIN ? "python" : "python3";
}

/**
 * Given a python executable path, find the `qrgen` script in the same
 * directory (i.e. the console_scripts entry point created by pip).
 *
 * Example: python at venv/Scripts/python.exe → venv/Scripts/qrgen.exe
 */
function findQrgenScript(pythonPath: string): string | null {
  const dir = path.dirname(pythonPath);
  const scriptName = IS_WIN ? "qrgen.exe" : "qrgen";
  const scriptPath = path.join(dir, scriptName);

  if (fs.existsSync(scriptPath)) {
    return scriptPath;
  }
  return null;
}

/**
 * Run a shell command synchronously and return stdout, or null on failure.
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

/**
 * Quote a path for cmd.exe (used by child_process.exec on Windows).
 */
function qCmd(p: string): string {
  return `"${p}"`;
}

/**
 * Build a PowerShell-safe command string for running an executable.
 * PowerShell needs the & (call) operator before a quoted path.
 * Example: & "C:\path with spaces\python.exe" -m pip install ...
 */
function psCall(exePath: string, args: string): string {
  if (IS_WIN && exePath.includes(" ")) {
    return `& "${exePath}" ${args}`;
  }
  return `"${exePath}" ${args}`;
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
    // exec() uses cmd.exe on Windows, so standard quoting works
    const result = tryExec(
      `${qCmd(python)} -c "import qrgen; print(qrgen.__version__)"`,
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
      "Install"
    );

    return choice === "Install";
  }

  /**
   * Install the CLI package using the integrated terminal so the user
   * can see all install logs (cloning, downloading, installing).
   * Then polls `checkCLI()` to detect when install finishes.
   *
   * Returns true if the install succeeded.
   */
  async installCLI(): Promise<boolean> {
    const installCmd = this.resolveInstallSource();

    // Use the integrated terminal so the user sees all install output
    const terminal =
      vscode.window.activeTerminal ??
      vscode.window.createTerminal("QRGen Install");
    terminal.show();
    terminal.sendText(installCmd);

    // Poll until the package becomes importable (max ~2 minutes)
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "QRGen: Waiting for installation to finish…",
        cancellable: true,
      },
      async (_progress, token) => {
        const maxAttempts = 60; // 60 × 2s = 2 minutes
        for (let i = 0; i < maxAttempts; i++) {
          if (token.isCancellationRequested) {
            return false;
          }

          // Wait 2 seconds between checks
          await new Promise((r) => setTimeout(r, 2000));

          const installed = await this.checkCLI();
          if (installed) {
            return true;
          }
        }

        vscode.window.showErrorMessage(
          "QRGen: Installation timed out. Check the terminal for errors " +
            "and try running the command again."
        );
        return false;
      }
    );
  }

  /**
   * Run the qrgen CLI to generate a QR code.
   * Uses the `qrgen` script from the same directory as the discovered
   * Python (the console_scripts entry point installed by pip).
   * Returns the absolute path to the generated image.
   */
  async generate(data: string, outputDir?: string): Promise<string> {
    const timestamp = Date.now();
    const filename = `qrcode_${timestamp}.png`;
    const python = this.pythonPath || findPython();

    // Find the qrgen script in the same directory as the Python executable
    const qrgenScript = findQrgenScript(python);

    // Build command — exec() uses cmd.exe on Windows, so standard quoting works
    let cmd: string;
    if (qrgenScript) {
      // Use the console_scripts entry point directly
      cmd = `${qCmd(qrgenScript)} "${data}" -o "${filename}"`;
    } else {
      // Fallback: invoke via python -c (works even without __main__.py)
      cmd =
        `${qCmd(python)} -c "` +
        `import sys; sys.argv = ['qrgen'] + sys.argv[1:]; ` +
        `from qrgen.cli import main; main()" ` +
        `"${data}" -o "${filename}"`;
    }

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
          // Check output/ subdirectory (CLI default)
          const subDirPath = path.join(outputDir, "output", filename);
          if (fs.existsSync(subDirPath)) {
            resolve(subDirPath);
            return;
          }
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
   * Always uses the discovered Python's -m pip to avoid PATH issues.
   */
  private resolveInstallSource(): string {
    const python = this.pythonPath || findPython();

    // This command is sent to the integrated terminal (PowerShell on Windows)
    // so we must use the & call operator for paths with spaces
    const pipArgs = "-m pip";

    // Check if the current workspace contains the qrgen package
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
      for (const folder of workspaceFolders) {
        const pyprojectPath = path.join(folder.uri.fsPath, "pyproject.toml");
        const qrgenPackagePath = path.join(folder.uri.fsPath, "qrgen");

        if (fs.existsSync(pyprojectPath) && fs.existsSync(qrgenPackagePath)) {
          return psCall(python, `${pipArgs} install -e "${folder.uri.fsPath}"`);
        }
      }
    }

    // Fallback: install from GitHub
    return psCall(python, `${pipArgs} install git+https://github.com/koshal50/Qrcode-Generator.git`);
  }
}
