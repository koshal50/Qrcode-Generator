# QRGen — QR Code Generator for VS Code

Generate QR codes instantly from within VS Code. Just enter a URL or text, and get a beautiful QR code preview with a download option.

## Features

- **One Command** — `Ctrl+Shift+P` → "QRGen: Generate QR Code"
- **Auto-Install** — Detects if the QRGen CLI is missing and offers to install it
- **Live Preview** — Shows the generated QR code in a styled webview panel
- **Download** — Save the QR code to any location on your system
- **Copy Path** — Copy the file path to your clipboard
- **Open Folder** — Open the containing folder in your OS file explorer

## Requirements

- **Python 3.9+** must be installed on your system
- **pip** must be available in your terminal

The extension will automatically install the required Python package (`qrcode-generator`) on first use.

## Usage

1. Open the Command Palette: `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
2. Type: **QRGen: Generate QR Code**
3. Enter a URL or text
4. View the generated QR code in the preview panel
5. Click **Download** to save it to a custom location

## How It Works

This extension uses the [QRGen CLI](https://github.com/koshal50/Qrcode-Generator) as a backend. The CLI is a Python package that generates QR codes from the terminal. The extension wraps it with a user-friendly VS Code interface.

## License

[MIT](LICENSE)
