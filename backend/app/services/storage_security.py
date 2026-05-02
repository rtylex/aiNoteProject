"""
Storage security — validates that file URLs point to our own uploads directory.

Replaces the old Supabase bucket URL validation.
"""
import os
from pathlib import Path

from app.core.config import settings


class InvalidStorageURLError(ValueError):
    """Raised when a document URL points outside the allowed storage."""


def ensure_allowed_storage_url(file_url: str) -> str:
    """
    Ensure that the given URL or path targets a safe location.

    Accepts:
      - Relative paths within the uploads directory (e.g. "uploads/file.pdf")
      - Full URLs pointing to our own backend /uploads/ path
    """
    if not file_url:
        raise InvalidStorageURLError("File URL is empty")

    # If it's a full URL, just ensure it contains /uploads/
    if file_url.startswith("http://") or file_url.startswith("https://"):
        if "/uploads/" not in file_url:
            raise InvalidStorageURLError("Document URL must target the uploads directory")
        return file_url

    # If it's a local path, resolve it and make sure it stays inside UPLOAD_DIR
    upload_root = Path(settings.UPLOAD_DIR).resolve()
    requested = (upload_root / file_url).resolve()

    if not str(requested).startswith(str(upload_root)):
        raise InvalidStorageURLError("Path traversal detected")

    return file_url
