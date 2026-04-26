"""CLI entry point for QRGen."""

import argparse
import sys
import os

from colorama import init, Fore, Style

from qrgen import __version__
from qrgen.generator import generate_qr, ERROR_CORRECTION_LEVELS

# Initialize colorama for cross-platform colored output
init(autoreset=True)

# ASCII-safe banner (no Unicode box-drawing chars — works on all terminals)
BANNER = f"""
{Fore.CYAN}{Style.BRIGHT}
     ___  ____   ____
    / _ \\|  _ \\ / ___| ___ _ __
   | | | | |_) | |  _ / _ \\ '_ \\
   | |_| |  _ <| |_| |  __/ | | |
    \\__\\_\\_| \\_\\\\____|\\___||_| |_|
{Style.RESET_ALL}
  {Fore.WHITE}{Style.DIM}Cross-Platform QR Code Generator{Style.RESET_ALL}
  {Fore.YELLOW}v{__version__}{Style.RESET_ALL}
"""


def create_parser() -> argparse.ArgumentParser:
    """Create and configure the argument parser."""
    parser = argparse.ArgumentParser(
        prog="qrgen",
        description="QRGen - Generate QR codes from your terminal. Works on Windows, macOS, and Linux.",
        epilog=(
            "Examples:\n"
            "  qrgen https://example.com\n"
            "  qrgen https://example.com -o mycode.png\n"
            "  qrgen https://example.com -d ~/Desktop\n"
            "  qrgen https://example.com --fill blue --bg yellow\n"
            "  qrgen https://example.com --size 15 --border 2 --ec H\n"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    parser.add_argument(
        "data",
        help="URL or text to encode in the QR code",
    )

    parser.add_argument(
        "-o", "--output",
        metavar="FILENAME",
        help="Custom output filename (e.g., mycode.png)",
    )

    parser.add_argument(
        "-d", "--dir",
        metavar="DIRECTORY",
        help="Output directory (default: ./output)",
    )

    parser.add_argument(
        "--fill",
        default="black",
        metavar="COLOR",
        help="QR code color (default: black)",
    )

    parser.add_argument(
        "--bg",
        default="white",
        metavar="COLOR",
        help="Background color (default: white)",
    )

    parser.add_argument(
        "--size",
        type=int,
        default=10,
        metavar="N",
        help="Box size in pixels (default: 10)",
    )

    parser.add_argument(
        "--border",
        type=int,
        default=4,
        metavar="N",
        help="Border width in boxes (default: 4)",
    )

    parser.add_argument(
        "--ec",
        choices=["L", "M", "Q", "H"],
        default="M",
        metavar="LEVEL",
        help="Error correction level: L (7%%), M (15%%), Q (25%%), H (30%%) (default: M)",
    )

    parser.add_argument(
        "-v", "--version",
        action="version",
        version=BANNER,
    )

    return parser


def main() -> None:
    """Main CLI entry point."""
    # Ensure UTF-8 output on Windows
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    # Show banner if no args provided
    if len(sys.argv) == 1:
        print(BANNER)
        print(
            f"  {Fore.RED}Error:{Style.RESET_ALL} No input provided.\n"
            f"  {Fore.WHITE}Usage:{Style.RESET_ALL} qrgen <url-or-text> [options]\n"
            f"  {Fore.WHITE}Help:{Style.RESET_ALL}  qrgen --help\n"
        )
        sys.exit(1)

    parser = create_parser()
    args = parser.parse_args()

    # Show generation progress
    print(
        f"\n  {Fore.CYAN}>{Style.RESET_ALL} "
        f"Generating QR code..."
    )

    try:
        file_path = generate_qr(
            data=args.data,
            output_dir=args.dir,
            filename=args.output,
            fill_color=args.fill,
            back_color=args.bg,
            box_size=args.size,
            border=args.border,
            error_correction=args.ec,
        )

        print(
            f"  {Fore.GREEN}+{Style.RESET_ALL} "
            f"QR code saved -> {Fore.GREEN}{Style.BRIGHT}{file_path}{Style.RESET_ALL}"
        )
        print(
            f"  {Fore.WHITE}{Style.DIM}Data: {args.data}{Style.RESET_ALL}"
        )
        print(
            f"  {Fore.WHITE}{Style.DIM}Size: {args.size}px | "
            f"Border: {args.border} | "
            f"EC: {args.ec} | "
            f"Colors: {args.fill}/{args.bg}{Style.RESET_ALL}\n"
        )

    except ValueError as e:
        print(f"  {Fore.RED}x Error:{Style.RESET_ALL} {e}\n")
        sys.exit(1)
    except Exception as e:
        print(f"  {Fore.RED}x Unexpected error:{Style.RESET_ALL} {e}\n")
        sys.exit(1)
