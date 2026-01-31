import httpx
import tempfile
import os
from pathlib import Path


async def download_audio(url: str) -> str:
    """Download audio file from URL to a temporary file. Returns the file path."""
    timeout = httpx.Timeout(30.0, connect=10.0, read=120.0)

    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream("GET", url, follow_redirects=True) as response:
            response.raise_for_status()

            suffix = ".mp3"
            if "content-type" in response.headers:
                content_type = response.headers["content-type"]
                if "wav" in content_type:
                    suffix = ".wav"
                elif "ogg" in content_type:
                    suffix = ".ogg"

            fd, temp_path = tempfile.mkstemp(suffix=suffix)
            total_bytes = 0
            try:
                async for chunk in response.aiter_bytes(chunk_size=65536):
                    os.write(fd, chunk)
                    total_bytes += len(chunk)
            finally:
                os.close(fd)

            print(f"[Download] Downloaded {total_bytes} bytes to {temp_path}")
            return temp_path


def cleanup_temp_file(file_path: str) -> None:
    """Remove a temporary file if it exists."""
    try:
        Path(file_path).unlink(missing_ok=True)
    except Exception:
        pass
