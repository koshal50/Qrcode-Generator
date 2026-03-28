import qrcode

url = input("Enter the URL: ")

file_path = r'D:\all projects\python qrcode generator\output\qrcode.png'

qr = qrcode.QRCode()
qr.add_data(url)
qr.make(fit=True)

img = qr.make_image(fill_color="black", back_color="white")
img.save(file_path)

print("QR Code saved successfully!")