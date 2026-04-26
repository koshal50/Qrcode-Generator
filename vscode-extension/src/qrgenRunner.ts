import * as vscode from "vscode";
import { exec } from "child_process";
import * as path from "path";
import * as fs from "fs";

export class QRGenRunner {
  /**
   * Check if the qrgen CLI is available by running `qrgen --version`.
   * This is more reliable than `pip show` — it checks if the command
   * actually exists in the current PATH / venv.
   */
  async checkCLI(): Promise<boolean> {
    return new Promise((resolve) => {
      exec("qrgen --version", { timeout: 10000 }, (error) => {
        resolve(!error);
      });
    });
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
   * Install the CLI package.
   * - Reuses the active terminal if one exists (preserves venv activation)
   * - Falls back to creating a new terminal only if none are open
   * - Installs from local project path if found in workspace, otherwise from GitHub
   */
  installCLI(): void {
    // Reuse existing terminal or create one
    const terminal =
      vscode.window.activeTerminal ??
      vscode.window.createTerminal("QRGen Install");
    terminal.show();

    // Determine the install source
    const installSource = this.resolveInstallSource();

    terminal.sendText(installSource);
  }

  /**
   * Run the qrgen CLI to generate a QR code.
   * Returns the absolute path to the generated image.
   */
  async generate(data: string, outputDir?: string): Promise<string> {
    const timestamp = Date.now();
    const filename = `qrcode_${timestamp}.png`;

    let cmd = `qrgen "${data}" -o "${filename}"`;
    if (outputDir) {
      cmd += ` -d "${outputDir}"`;
    }

    return new Promise((resolve, reject) => {
      exec(cmd, { timeout: 15000 }, (error, stdout, stderr) => {
        if (error) {
          // Try to extract a useful error message
          const errMsg =
            stderr?.trim() || stdout?.trim() || error.message;
          reject(new Error(errMsg));
          return;
        }

        // Parse the output to find the file path
        // CLI outputs: "QR code saved -> <path>"
        const output = stdout.trim();
        const match = output.match(/saved\s*->\s*(.+)/i);

        if (match && match[1]) {
          // Strip ANSI color codes from the path
          const cleanPath = match[1].trim().replace(/\x1b\[[0-9;]*m/g, "");
          resolve(cleanPath);
        } else if (outputDir) {
          // Fallback: construct the expected path
          resolve(path.join(outputDir, filename));
        } else {
          resolve(filename);
        }
      });
    });
  }

  /**
   * Determine the best install command.
   *
   * Priority:
   * 1. Local workspace — if pyproject.toml with qrgen is found, install from there
   * 2. GitHub repo — fallback to installing from the remote repo
   */
  private resolveInstallSource(): string {
    const pipCmd = process.platform === "win32" ? "pip" : "pip3";

    // Check if the current workspace contains the qrgen package
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
      for (const folder of workspaceFolders) {
        const pyprojectPath = path.join(folder.uri.fsPath, "pyproject.toml");
        const qrgenPackagePath = path.join(folder.uri.fsPath, "qrgen");

        if (fs.existsSync(pyprojectPath) && fs.existsSync(qrgenPackagePath)) {
          // Local project found — install in editable mode
          return `${pipCmd} install -e "${folder.uri.fsPath}"`;
        }
      }
    }

    // Fallback: install from GitHub
    return `${pipCmd} install git+https://github.com/koshal50/Qrcode-Generator.git`;
  }
}
