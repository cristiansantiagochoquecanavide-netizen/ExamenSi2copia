"""
AI Background Removal Service for Virtual Try-On (V-TON).
Uses rembg (ONNX U2Net model) to remove backgrounds from garment images,
producing clean PNG images with transparency for overlay on live camera feed.
"""

import io
import os
import hashlib
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Directory where background-removed PNGs are saved
UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "static", "uploads", "prendas"
)
NOBG_DIR = os.path.join(UPLOAD_DIR, "nobg")
os.makedirs(NOBG_DIR, exist_ok=True)

# Lazy-loaded rembg session (loads ONNX model on first call, ~50MB download)
_rembg_session = None


def _get_session():
    """Lazy-load the rembg ONNX session to avoid startup delay."""
    global _rembg_session
    if _rembg_session is None:
        try:
            from rembg import new_session
            # u2net is the general-purpose model; u2net_cloth_seg is fashion-specific
            # but requires extra setup. u2net works well for garments on plain backgrounds.
            _rembg_session = new_session("u2net")
            logger.info("rembg u2net session loaded successfully")
        except Exception as exc:
            logger.error("Failed to load rembg session: %s", exc)
            raise RuntimeError(f"rembg session failed to load: {exc}") from exc
    return _rembg_session


def remove_background_from_bytes(image_bytes: bytes) -> bytes:
    """
    Remove background from raw image bytes.
    Returns PNG bytes with transparency (alpha channel).
    """
    from rembg import remove
    session = _get_session()
    result = remove(image_bytes, session=session)
    return result


def get_nobg_path_for_source(source_path: str) -> str:
    """
    Derive the nobg PNG output path from the original image path.
    Uses a hash of the source filename so the mapping is deterministic.
    """
    stem = Path(source_path).stem
    digest = hashlib.md5(stem.encode()).hexdigest()[:8]
    return os.path.join(NOBG_DIR, f"{stem}_nobg_{digest}.png")


def process_image_file(source_path: str, force: bool = False) -> str:
    """
    Process a single image file: remove background, save as PNG.
    Returns the output file path.

    Args:
        source_path: Absolute path to the source image (JPG/WebP/PNG).
        force: If True, re-process even if the nobg PNG already exists.

    Returns:
        Absolute path to the saved PNG with transparent background.
    """
    out_path = get_nobg_path_for_source(source_path)

    if not force and os.path.exists(out_path):
        logger.debug("nobg already exists, skipping: %s", out_path)
        return out_path

    with open(source_path, "rb") as f:
        image_bytes = f.read()

    png_bytes = remove_background_from_bytes(image_bytes)

    with open(out_path, "wb") as f:
        f.write(png_bytes)

    logger.info("Background removed: %s -> %s", source_path, out_path)
    return out_path


def build_nobg_url(request, filename: str) -> str:
    """Build the public URL for a nobg PNG given its filename."""
    base = "http://localhost:8000"
    if request and request.base_url:
        b = str(request.base_url).rstrip("/")
        if "backend:8000" not in b:
            base = b
    return f"{base}/static/uploads/prendas/nobg/{filename}"
