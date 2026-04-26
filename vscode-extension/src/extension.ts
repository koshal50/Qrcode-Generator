import * as vscode from "vscode";
import { QRGenRunner } from "./qrgenRunner";
import { QRPreviewPanel } from "./webviewPanel";

export function activate(context: vscode.ExtensionContext) {
  const runner = new QRGenRunner();

  const generateCmd = vscode.commands.registerCommand(
    "qrgen.generateQR",
    async () => {
      // Step 1: Check if CLI is installed
      const installed = await runner.checkCLI();

      if (!installed) {
        // Step 2: Show dependency preview
        const shouldInstall = await runner.showDependencyPreview();
        if (!shouldInstall) {
          return;
        }

        // Step 3: Install flow
        runner.installCLI();
        vscode.window.showInformationMessage(
          "Installing QRGen CLI... Please wait for the terminal to finish, then re-run the command."
        );
        return;
      }

      // Step 4: Get input from user
      const input = await vscode.window.showInputBox({
        prompt: "Enter URL or text to encode as QR code",
        placeHolder: "https://example.com",
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return "Please enter a URL or text";
          }
          return null;
        },
      });

      if (!input) {
        return; // User cancelled
      }

      // Step 5: Determine output directory
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      const outputDir = workspaceFolder
        ? `${workspaceFolder}`
        : undefined;

      // Step 6: Generate QR code
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "QRGen: Generating QR code...",
          cancellable: false,
        },
        async () => {
          try {
            const filePath = await runner.generate(input, outputDir);

            // Step 7: Show result in webview
            QRPreviewPanel.show(context, filePath, input);

            vscode.window.showInformationMessage(
              `QR code generated: ${filePath}`
            );
          } catch (err: any) {
            vscode.window.showErrorMessage(
              `QRGen Error: ${err.message || err}`
            );
          }
        }
      );
    }
  );

  context.subscriptions.push(generateCmd);
}

export function deactivate() {}
