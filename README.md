# QRcode-Generator

A simple **Python** QR code generator that creates **permanent (static) QR codes** and saves them in the `output/` folder.

- Generated QR codes are saved in: `output/`
- A **demo QR code** is also included inside the `output/` folder.

---

## Requirements
- Python **3.9+** (as defined in `pyproject.toml`)

---

## Setup (from `pyproject.toml`)

This project uses **setuptools** via `pyproject.toml` (not Poetry).

### 1) Clone the repository
```bash
git clone https://github.com/koshal50/Qrcode-Generator.git
```

### 2) Go into the project folder
```bash
cd Qrcode-Generator
```

### If there is an error while changing the directory
Try this command exactly (as noted):
```bash
cd "Qrcode-Generator"
```

> Note: The folder name must match the actual folder name on your machine. If it doesn’t, list folders and `cd` into the correct one.

---

## Create a virtual environment (recommended)

### macOS / Linux
```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
```

### Windows (PowerShell)
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
```

---

## Install dependencies

### install from `pyproject.toml`
This installs the dependencies (`qrcode`, `Pillow`) and installs the package locally.
```bash
pip install .
```

## Run the project

The script to run is:

```bash
python generate_qr.py
```

---

## Output
- All generated QR codes are written to the **`output/`** folder.
- A **demo QR code** is present inside `output/`.

---

## Troubleshooting

### Module not found / dependencies not installed
Make sure your virtual environment is activated, then run:
```bash
pip install .
```

### Still having directory issues
If `cd Qrcode-Generator` fails, try:
```bash
cd python` qrcode` generator
```

---

## License
This project is licensed under the **MIT License** — see the `LICENSE` file for details.
