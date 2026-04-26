import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export class QRPreviewPanel {
  private static currentPanel: QRPreviewPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private disposed = false;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    imagePath: string,
    encodedData: string
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;

    this.panel.webview.html = this.getWebviewContent(imagePath, encodedData);

    // Handle messages from the webview (download, copy path, open folder)
    this.panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "download": {
          const sourceUri = vscode.Uri.file(imagePath);
          const defaultName = path.basename(imagePath);

          const saveUri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(
              path.join(
                vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "",
                defaultName
              )
            ),
            filters: { "PNG Image": ["png"] },
            title: "Save QR Code",
          });

          if (saveUri) {
            try {
              fs.copyFileSync(sourceUri.fsPath, saveUri.fsPath);
              vscode.window.showInformationMessage(
                `QR code saved to: ${saveUri.fsPath}`
              );
            } catch (err: any) {
              vscode.window.showErrorMessage(
                `Failed to save: ${err.message}`
              );
            }
          }
          break;
        }

        case "copyPath": {
          await vscode.env.clipboard.writeText(imagePath);
          vscode.window.showInformationMessage("File path copied to clipboard!");
          break;
        }

        case "openFolder": {
          const folderUri = vscode.Uri.file(path.dirname(imagePath));
          vscode.commands.executeCommand("revealFileInOS", folderUri);
          break;
        }
      }
    });

    this.panel.onDidDispose(() => {
      this.disposed = true;
      QRPreviewPanel.currentPanel = undefined;
    });
  }

  /**
   * Show a QR preview panel. Reuses existing panel if open.
   */
  static show(
    context: vscode.ExtensionContext,
    imagePath: string,
    encodedData: string
  ): void {
    const column = vscode.ViewColumn.Beside;

    // If a panel already exists, update its content
    if (QRPreviewPanel.currentPanel && !QRPreviewPanel.currentPanel.disposed) {
      QRPreviewPanel.currentPanel.panel.reveal(column);
      QRPreviewPanel.currentPanel.panel.webview.html =
        QRPreviewPanel.currentPanel.getWebviewContent(imagePath, encodedData);
      return;
    }

    // Create a new panel
    const panel = vscode.window.createWebviewPanel(
      "qrgenPreview",
      "QR Code Preview",
      column,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.file(path.dirname(imagePath)),
          vscode.Uri.joinPath(context.extensionUri, "media"),
        ],
      }
    );

    QRPreviewPanel.currentPanel = new QRPreviewPanel(
      panel,
      context.extensionUri,
      imagePath,
      encodedData
    );
  }

  /**
   * Build the styled HTML for the webview with QR preview and download button.
   */
  private getWebviewContent(imagePath: string, encodedData: string): string {
    const imageUri = this.panel.webview.asWebviewUri(
      vscode.Uri.file(imagePath)
    );
    const cspSource = this.panel.webview.cspSource;
    const nonce = getNonce();

    return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource}; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QR Code Preview</title>
  <style nonce="${nonce}">
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      background: var(--vscode-editor-background, #1e1e1e);
      color: var(--vscode-editor-foreground, #cccccc);
      font-family: var(--vscode-font-family, 'Segoe UI', sans-serif);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 24px;
    }

    .container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      max-width: 480px;
      width: 100%;
    }

    .card {
      background: var(--vscode-editorWidget-background, #252526);
      border: 1px solid var(--vscode-editorWidget-border, #454545);
      border-radius: 12px;
      padding: 32px;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .badge {
      background: linear-gradient(135deg, #6C3CE1, #3B82F6);
      color: white;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      padding: 4px 14px;
      border-radius: 20px;
    }

    .qr-wrapper {
      background: #ffffff;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    }

    .qr-wrapper img {
      max-width: 240px;
      max-height: 240px;
      width: 100%;
      height: auto;
      image-rendering: pixelated;
    }

    .data-label {
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #888);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      font-weight: 600;
    }

    .data-value {
      font-size: 14px;
      color: var(--vscode-editor-foreground, #ccc);
      word-break: break-all;
      text-align: center;
      max-width: 100%;
      padding: 8px 12px;
      background: var(--vscode-input-background, #3c3c3c);
      border-radius: 6px;
      border: 1px solid var(--vscode-input-border, #555);
      width: 100%;
    }

    .actions {
      display: flex;
      gap: 10px;
      width: 100%;
      flex-wrap: wrap;
    }

    .btn {
      flex: 1;
      min-width: 120px;
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s ease;
      font-family: inherit;
    }

    .btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .btn:active {
      transform: translateY(0);
    }

    .btn-primary {
      background: linear-gradient(135deg, #6C3CE1, #3B82F6);
      color: white;
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, #7C4CF1, #4B92FF);
    }

    .btn-secondary {
      background: var(--vscode-button-secondaryBackground, #3a3d41);
      color: var(--vscode-button-secondaryForeground, #cccccc);
    }

    .btn-secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground, #505050);
    }

    .file-path {
      font-size: 11px;
      color: var(--vscode-descriptionForeground, #666);
      word-break: break-all;
      text-align: center;
      opacity: 0.7;
    }

    .icon {
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <span class="badge">QR Code Generated</span>

      <div class="qr-wrapper">
        <img src="${imageUri}" alt="QR Code" />
      </div>

      <span class="data-label">Encoded Data</span>
      <div class="data-value">${escapeHtml(encodedData)}</div>

      <div class="actions">
        <button class="btn btn-primary" id="downloadBtn" title="Save QR code to a custom location">
          <span class="icon">⬇</span> Download
        </button>
        <button class="btn btn-secondary" id="copyPathBtn" title="Copy file path to clipboard">
          <span class="icon">📋</span> Copy Path
        </button>
        <button class="btn btn-secondary" id="openFolderBtn" title="Open containing folder">
          <span class="icon">📂</span> Open Folder
        </button>
      </div>

      <span class="file-path">${escapeHtml(imagePath)}</span>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    document.getElementById('downloadBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'download' });
    });

    document.getElementById('copyPathBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'copyPath' });
    });

    document.getElementById('openFolderBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'openFolder' });
    });
  </script>
</body>
</html>`;
  }
}

/** Generate a random nonce for CSP */
function getNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}

/** Escape HTML special characters */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
