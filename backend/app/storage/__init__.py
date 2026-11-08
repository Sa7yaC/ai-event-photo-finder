from functools import lru_cache
from app.storage.base import StorageService
from app.storage.local import LocalStorageService


@lru_cache()
def get_storage_service() -> StorageService:
    return LocalStorageService()


__all__ = ["StorageService", "LocalStorageService", "get_storage_service"]
