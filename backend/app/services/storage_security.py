from urllib.parse import urlparse

from app.core.config import settings


class InvalidStorageURLError(ValueError):
    """Raised when a document URL points outside the allowed storage."""


def ensure_allowed_storage_url(file_url: str) -> str:
    """Ensure that the given URL targets the configured Supabase storage bucket."""
    try:
        parsed = urlparse(file_url)
    except Exception as exc:
        raise InvalidStorageURLError("Unable to parse document URL") from exc

    if parsed.scheme not in {"https"}:
        raise InvalidStorageURLError("Document URL must use HTTPS")

    supabase_host = urlparse(settings.SUPABASE_URL).netloc
    if parsed.netloc != supabase_host:
        raise InvalidStorageURLError("Document URL must belong to the Supabase project")

    bucket = settings.SUPABASE_STORAGE_BUCKET.strip('/')
    path = (parsed.path or "")
    allowed_prefixes = [
        f"/storage/v1/object/public/{bucket}/",
        f"/storage/v1/object/sign/{bucket}/",
        f"/storage/v1/object/{bucket}/",
    ]

    if not any(path.startswith(prefix) for prefix in allowed_prefixes):
        raise InvalidStorageURLError("Document URL must target the configured Supabase bucket")

    return file_url
