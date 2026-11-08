import logging
import os
from pathlib import Path
import uuid
from app.core.config import settings
from app.storage.base import StorageService

logger = logging.getLogger(__name__)


class LocalStorageService(StorageService):
    def __init__(self, base_dir: str | Path | None = None):
        if base_dir is None:
            # Anchor relative to backend project root
            self.base_dir = Path(settings.STORAGE_DIR).resolve()
        else:
            self.base_dir = Path(base_dir).resolve()
            
        self.base_dir.mkdir(parents=True, exist_ok=True)
        logger.info("LocalStorageService initialized at %s", self.base_dir)

    def _resolve_safe_path(self, storage_key: str) -> Path:
        """
        Resolve storage_key against base_dir and ensure no path traversal is possible.
        """
        # Normalize separators
        clean_key = storage_key.replace("\\", "/").lstrip("/")
        target_path = (self.base_dir / clean_key).resolve()
        
        # Verify that target_path is strictly within base_dir
        try:
            target_path.relative_to(self.base_dir)
        except ValueError:
            logger.error("Path traversal attempt detected: %s", storage_key)
            raise ValueError(f"Invalid storage key: {storage_key}")
            
        return target_path

    async def save_file(self, content: bytes, filename: str, subfolder: str = "") -> str:
        # Determine extension safely
        ext = Path(filename).suffix.lower()
        if not ext:
            ext = ".jpg"
            
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        
        # Build relative storage key
        if subfolder:
            clean_subfolder = subfolder.strip("/\\")
            storage_key = f"{clean_subfolder}/{unique_filename}"
        else:
            storage_key = unique_filename
            
        full_path = self._resolve_safe_path(storage_key)
        full_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write bytes
        with open(full_path, "wb") as f:
            f.write(content)
            
        logger.info("File saved to storage: %s (%d bytes)", storage_key, len(content))
        return storage_key

    def get_file_path(self, storage_key: str) -> Path:
        path = self._resolve_safe_path(storage_key)
        if not path.is_file():
            raise FileNotFoundError(f"Storage asset not found: {storage_key}")
        return path

    async def delete_file(self, storage_key: str) -> bool:
        try:
            path = self._resolve_safe_path(storage_key)
            if path.is_file():
                path.unlink()
                logger.info("Deleted file from storage: %s", storage_key)
                return True
            return False
        except Exception as e:
            logger.warning("Error deleting storage asset %s: %s", storage_key, str(e))
            return False

    def file_exists(self, storage_key: str) -> bool:
        try:
            path = self._resolve_safe_path(storage_key)
            return path.is_file()
        except ValueError:
            return False
