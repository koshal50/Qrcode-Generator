import qrcode
from pathlib import Path

url = input("Enter the URL: ").strip()

output_dir = Path(__file__).parent / "output"
output_dir.mkdir(parents=True, exist_ok=True)

index = 1
while (output_dir / f"qrcode{index}.png").exists():
    index += 1

file_path = output_dir / f"qrcode{index}.png"

qr = qrcode.QRCode()
qr.add_data(url)
qr.make(fit=True)

img = qr.make_image(fill_color="black", back_color="white")
img.save(file_path)

print(f"QR Code saved successfully at: {file_path}")