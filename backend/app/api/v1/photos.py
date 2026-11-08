import logging
from typing import Optional
import uuid
from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.photo import PhotoResponse
from app.services.event_service import EventService
from app.services.photo_service import PhotoService
from app.storage import StorageService, get_storage_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/{photo_id}", response_model=PhotoResponse, summary="Get photo metadata")
async def get_photo(
    photo_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> PhotoResponse:
    photo = await PhotoService.get_photo_by_id(db, photo_id)
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Photo with ID '{photo_id}' not found.",
        )
    return PhotoResponse.model_validate(photo)


@router.get("/{photo_id}/download", summary="Download photo file")
async def download_photo(
    photo_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    storage: StorageService = Depends(get_storage_service),
):
    """
    Controlled download of the original photo from local storage.
    Prevents path traversal and validates file presence.
    """
    photo = await PhotoService.get_photo_by_id(db, photo_id)
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Photo with ID '{photo_id}' not found.",
        )

    try:
        file_path = storage.get_file_path(photo.storage_key)
        return FileResponse(
            path=str(file_path),
            media_type=photo.content_type,
            filename=photo.original_filename,
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Physical image asset missing from storage.",
        )


@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete photo")
async def delete_photo(
    photo_id: uuid.UUID,
    x_organizer_token: Optional[str] = Header(None, alias="X-Organizer-Token"),
    db: AsyncSession = Depends(get_db),
    storage: StorageService = Depends(get_storage_service),
):
    """
    Delete a photograph and its associated storage assets.
    Requires authorization with the event's organizer token.
    """
    photo = await PhotoService.get_photo_by_id(db, photo_id)
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Photo with ID '{photo_id}' not found.",
        )

    # Fetch event to verify organizer token
    event = await EventService.get_event_by_id(db, photo.event_id)
    if not event or not EventService.verify_organizer_token(event, x_organizer_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing X-Organizer-Token header.",
        )

    await PhotoService.delete_photo(db, photo, storage)
    return None
