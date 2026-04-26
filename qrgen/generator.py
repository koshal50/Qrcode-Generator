"""Core QR code generation logic."""

import qrcode
from pathlib import Path


# Map user-friendly names to qrcode constants
ERROR_CORRECTION_LEVELS = {
    "L": qrcode.constants.ERROR_CORRECT_L,  # ~7% error recovery
    "M": qrcode.constants.ERROR_CORRECT_M,  # ~15% error recovery
    "Q": qrcode.constants.ERROR_CORRECT_Q,  # ~25% error recovery
    "H": qrcode.constants.ERROR_CORRECT_H,  # ~30% error recovery
}


def generate_qr(
    data: str,
    output_dir: Path | None = None,
    filename: str | None = None,
    fill_color: str = "black",
    back_color: str = "white",
    box_size: int = 10,
    border: int = 4,
    error_correction: str = "M",
) -> Path:
    """
    Generate a QR code image and save it to disk.

    Args:
        data: The URL or text to encode in the QR code.
        output_dir: Directory to save the QR image. Defaults to ./output.
        filename: Custom filename. Auto-generates qrcodeN.png if not provided.
        fill_color: Color of the QR code modules (default: black).
        back_color: Background color (default: white).
        box_size: Size of each box in the QR code grid (default: 10).
        border: Border width in boxes (default: 4, minimum per spec).
        error_correction: Error correction level - L, M, Q, or H (default: M).

    Returns:
        Path to the saved QR code image.

    Raises:
        ValueError: If error_correction level is invalid.
    """
    # Resolve output directory
    if output_dir is None:
        output_dir = Path.cwd() / "output"
    else:
        output_dir = Path(output_dir)

    output_dir.mkdir(parents=True, exist_ok=True)

    # Resolve filename
    if filename:
        # Ensure .png extension
        if not filename.lower().endswith(".png"):
            filename += ".png"
        file_path = output_dir / filename
    else:
        index = 1
        while (output_dir / f"qrcode{index}.png").exists():
            index += 1
        file_path = output_dir / f"qrcode{index}.png"

    # Validate error correction level
    ec_key = error_correction.upper()
    if ec_key not in ERROR_CORRECTION_LEVELS:
        raise ValueError(
            f"Invalid error correction level '{error_correction}'. "
            f"Choose from: {', '.join(ERROR_CORRECTION_LEVELS.keys())}"
        )

    # Generate QR code
    qr = qrcode.QRCode(
        version=None,  # Auto-detect smallest version
        error_correction=ERROR_CORRECTION_LEVELS[ec_key],
        box_size=box_size,
        border=border,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color=fill_color, back_color=back_color)
    img.save(file_path)

    return file_path
