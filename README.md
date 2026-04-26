# QRGen — CLI QR Code Generator

A cross-platform command-line tool to generate QR codes directly from your terminal. Works on **Windows**, **macOS**, and **Linux**.

```
   ██████╗ ██████╗  ██████╗ ███████╗███╗   ██╗
  ██╔═══██╗██╔══██╗██╔════╝ ██╔════╝████╗  ██║
  ██║   ██║██████╔╝██║  ███╗█████╗  ██╔██╗ ██║
  ██║▄▄ ██║██╔══██╗██║   ██║██╔══╝  ██║╚██╗██║
  ╚██████╔╝██║  ██║╚██████╔╝███████╗██║ ╚████║
   ╚══▀▀═╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝
```

## Features

- 🚀 **One command** — `qrgen <url>` and you're done
- 🎨 **Custom colors** — set fill and background colors
- 📐 **Adjustable size** — control box size and border width
- 🛡️ **Error correction** — choose from L, M, Q, H levels
- 🖥️ **Cross-platform** — Windows, macOS, Linux
- 🎯 **Zero config** — works out of the box

---

## Installation

### Prerequisites

- **Python 3.9+** installed on your system
- **pip** (comes with Python)

### Windows

```powershell
# Clone the repository
git clone https://github.com/koshal50/Qrcode-Generator.git
cd Qrcode-Generator

# Create virtual environment (optional but recommended)
python -m venv venv
venv\Scripts\activate

# Install the CLI tool
pip install .
```

### macOS / Linux

```bash
# Clone the repository
git clone https://github.com/koshal50/Qrcode-Generator.git
cd Qrcode-Generator

# Create virtual environment (optional but recommended)
python3 -m venv venv
source venv/bin/activate

# Install the CLI tool
pip install .
```

After installation, the `qrgen` command is available globally in your terminal (or within the active virtual environment).

---

## Usage

### Basic Usage

```bash
# Generate a QR code for a URL
qrgen https://example.com

# Generate a QR code for any text
qrgen "Hello, World!"
```

### Custom Output

```bash
# Save with a custom filename
qrgen https://example.com -o mycode.png

# Save to a specific directory
qrgen https://example.com -d ~/Desktop
```

### Styling

```bash
# Custom colors
qrgen https://example.com --fill blue --bg yellow

# Custom size and border
qrgen https://example.com --size 15 --border 2

# High error correction (good for printing)
qrgen https://example.com --ec H
```

### All Options

```bash
# Combine everything
qrgen https://example.com -o logo.png -d ~/Desktop --fill darkblue --bg lightyellow --size 12 --border 3 --ec H
```

---

## CLI Reference

```
qrgen <data> [options]
```

| Option | Short | Description | Default |
|---|---|---|---|
| `data` | | URL or text to encode (required) | — |
| `--output` | `-o` | Custom output filename | `qrcodeN.png` |
| `--dir` | `-d` | Output directory | `./output` |
| `--fill` | | QR code color | `black` |
| `--bg` | | Background color | `white` |
| `--size` | | Box size in pixels | `10` |
| `--border` | | Border width in boxes | `4` |
| `--ec` | | Error correction: L, M, Q, H | `M` |
| `--version` | `-v` | Show version info | — |
| `--help` | `-h` | Show help message | — |

### Error Correction Levels

| Level | Recovery | Best For |
|---|---|---|
| **L** | ~7% | Clean digital displays |
| **M** | ~15% | General purpose (default) |
| **Q** | ~25% | Slightly damaged codes |
| **H** | ~30% | Printed materials, logos |

---

## Uninstall

```bash
pip uninstall qrcode-generator
```

---

## License

[MIT](LICENSE)