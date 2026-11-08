from abc import ABC, abstractmethod
from pathlib import Path
from typing import BinaryIO, Optional


class StorageService(ABC):
    """Abstract storage interface allowing swapping between Local, S3, R2, etc."""

    @abstractmethod
    async def save_file(self, content: bytes, filename: str, subfolder: str = "") -> str:
        """Save file bytes and return a unique storage_key."""
        pass

    @abstractmethod
    def get_file_path(self, storage_key: str) -> Path:
        """Retrieve local filesystem path for a storage_key, strictly validating path traversal."""
        pass

    @abstractmethod
    async def delete_file(self, storage_key: str) -> bool:
        """Delete file associated with storage_key."""
        pass

    @abstractmethod
    def file_exists(self, storage_key: str) -> bool:
        """Check if file exists in storage."""
        pass
