import httpx
import tempfile
import os
from pathlib import Path


async def download_audio(url: str) -> str:
    """Download audio file from URL to a temporary file. Returns the file path."""
    async with httpx.AsyncClient() as client:
        response = await client.get(url, follow_redirects=True)
        response.raise_for_status()

        suffix = ".mp3"
        if "content-type" in response.headers:
            content_type = response.headers["content-type"]
            if "wav" in content_type:
                suffix = ".wav"
            elif "ogg" in content_type:
                suffix = ".ogg"

        fd, temp_path = tempfile.mkstemp(suffix=suffix)
        try:
            os.write(fd, response.content)
        finally:
            os.close(fd)

        return temp_path


def cleanup_temp_file(file_path: str) -> None:
    """Remove a temporary file if it exists."""
    try:
        Path(file_path).unlink(missing_ok=True)
    except Exception:
        pass
