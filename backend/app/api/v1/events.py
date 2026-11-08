from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Header, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.event import (
    EventCreate,
    EventCreatedResponse,
    EventResponse,
    EventStatsResponse,
)
from app.schemas.photo import PhotoBatchUploadResponse, PhotoListResponse, PhotoResponse
from app.services.event_service import EventService
from app.services.photo_service import PhotoService
from app.storage import StorageService, get_storage_service
from app.ai import FaceRecognitionService, get_face_recognition_service

router = APIRouter()


@router.post("", response_model=EventCreatedResponse, status_code=status.HTTP_201_CREATED, summary="Create an event")
async def create_event(
    data: EventCreate,
    db: AsyncSession = Depends(get_db),
) -> EventCreatedResponse:
    """
    Create a new event. Returns the event metadata along with a secret organizer_token.
    The organizer_token must be saved by the client to perform administrative operations.
    """
    event = await EventService.create_event(db, data)
    return EventCreatedResponse.model_validate(event)


@router.get("", response_model=List[EventResponse], summary="List events")
async def list_events(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> List[EventResponse]:
    """List events for dashboard overview."""
    events = await EventService.list_events(db, limit=limit, offset=offset)
    return [EventResponse.model_validate(e) for e in events]


@router.get("/by-slug/{slug}", response_model=EventResponse, summary="Get public event by slug")
async def get_event_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db),
) -> EventResponse:
    """Public event lookup for attendees using the event URL or QR code."""
    event = await EventService.get_event_by_slug(db, slug)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with slug '{slug}' not found.",
        )
    return EventResponse.model_validate(event)


@router.get("/{event_id}", response_model=EventResponse, summary="Get event by ID")
async def get_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> EventResponse:
    event = await EventService.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with ID '{event_id}' not found.",
        )
    return EventResponse.model_validate(event)


@router.get("/{event_id}/stats", response_model=EventStatsResponse, summary="Get event statistics")
async def get_event_stats(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> EventStatsResponse:
    """Retrieve photograph ingestion and processing metrics for the event."""
    event = await EventService.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with ID '{event_id}' not found.",
        )
    return await EventService.get_event_stats(db, event)


@router.post(
    "/{event_id}/photos",
    response_model=PhotoBatchUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload photos to event",
)
async def upload_photos(
    event_id: uuid.UUID,
    files: List[UploadFile],
    x_organizer_token: Optional[str] = Header(None, alias="X-Organizer-Token"),
    db: AsyncSession = Depends(get_db),
    storage: StorageService = Depends(get_storage_service),
    face_svc: FaceRecognitionService = Depends(get_face_recognition_service),
) -> PhotoBatchUploadResponse:
    """
    Upload one or multiple photographs to the designated event.
    Requires the organizer secret token in the 'X-Organizer-Token' header.
    """
    event = await EventService.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with ID '{event_id}' not found.",
        )

    # Validate organizer authorization
    if not EventService.verify_organizer_token(event, x_organizer_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing X-Organizer-Token header.",
        )

    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files provided in upload request.",
        )

    # Process and validate photos
    return await PhotoService.upload_photos(db, event, files, storage, face_svc=face_svc)


@router.get(
    "/{event_id}/photos",
    response_model=PhotoListResponse,
    summary="List event photos (organizer gallery)",
)
async def list_event_photos(
    event_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    x_organizer_token: Optional[str] = Header(None, alias="X-Organizer-Token"),
    db: AsyncSession = Depends(get_db),
) -> PhotoListResponse:
    """
    Retrieve photo metadata for the specified event.
    Protected endpoint requiring the organizer token.
    """
    event = await EventService.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with ID '{event_id}' not found.",
        )

    if not EventService.verify_organizer_token(event, x_organizer_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing X-Organizer-Token header.",
        )

    total, photos = await PhotoService.list_event_photos(db, event.id, limit=limit, offset=offset)
    return PhotoListResponse(
        total=total,
        limit=limit,
        offset=offset,
        items=[PhotoResponse.model_validate(p) for p in photos],
    )


@router.post(
    "/{event_id}/reindex",
    summary="Re-index event photos with active face recognition model",
    tags=["Events"],
)
async def reindex_event_photos(
    event_id: uuid.UUID,
    x_organizer_token: Optional[str] = Header(None, alias="X-Organizer-Token"),
    db: AsyncSession = Depends(get_db),
    storage: StorageService = Depends(get_storage_service),
    face_svc: FaceRecognitionService = Depends(get_face_recognition_service),
):
    """
    Re-index all stored photos for the event using the current deep learning face model.
    Requires organizer authorization.
    """
    event = await EventService.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with ID '{event_id}' not found.",
        )

    if not EventService.verify_organizer_token(event, x_organizer_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing X-Organizer-Token header.",
        )

    return await PhotoService.reindex_event_photos(
        db=db,
        event_id=event.id,
        storage=storage,
        face_svc=face_svc,
    )
