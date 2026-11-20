from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Header, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.v1.auth import get_current_user, get_optional_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.event import (
    EventCreate,
    EventCreatedResponse,
    EventResponse,
    EventSettingsUpdate,
    EventStatsResponse,
    EventViewResponse,
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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EventCreatedResponse:
    """
    Create a new event owned by the signed-in host. Returns the event metadata and a
    secret organizer_token for administrative operations.
    """
    event = await EventService.create_event(db, data, owner=current_user)
    return EventCreatedResponse.model_validate(event)


@router.get("", response_model=List[EventResponse], summary="List events")
async def list_events(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> List[EventResponse]:
    """List events. Signed-in hosts see their own events; anonymous callers see the public list."""
    events = await EventService.list_events(db, limit=limit, offset=offset, owner=current_user)
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


@router.get(
    "/{event_id}/view",
    response_model=EventViewResponse,
    summary="Event page payload for hosts and attendees",
)
async def get_event_view(
    event_id: uuid.UUID,
    x_attendee_key: Optional[str] = Header(None, alias="X-Attendee-Key"),
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> EventViewResponse:
    """
    Return the event page data, resolved for the caller's role.

    - Hosts see their album with all uploaded photos and management actions.
    - Attendees see the event details and their scanned photos.
    """
    event = await EventService.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with ID '{event_id}' not found.",
        )

    stats = await EventService.get_event_stats(db, event)
    is_host = EventService.is_host(event, current_user)
    attendee_key = x_attendee_key.strip() if x_attendee_key else None
    if attendee_key and len(attendee_key) > 64:
        attendee_key = None

    if not is_host and (current_user or attendee_key):
        await EventService.register_attendee(db, event.id, current_user, attendee_key)
        stats = await EventService.get_event_stats(db, event)

    return EventViewResponse(
        **EventResponse.model_validate(event).model_dump(),
        is_host=is_host,
        attendees=stats.attendees,
        total_photos=stats.total_photos,
    )


@router.patch(
    "/{event_id}/settings",
    response_model=EventResponse,
    summary="Update host-controlled event settings",
)
async def update_event_settings(
    event_id: uuid.UUID,
    payload: EventSettingsUpdate,
    x_organizer_token: Optional[str] = Header(None, alias="X-Organizer-Token"),
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> EventResponse:
    event = await EventService.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with ID '{event_id}' not found.",
        )

    authorized = EventService.verify_organizer_token(event, x_organizer_token) or EventService.is_host(
        event, current_user
    )
    if not authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the event host can change these settings.",
        )

    updated = await EventService.update_settings(db, event, payload.match_tolerance)
    return EventResponse.model_validate(updated)


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
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> PhotoListResponse:
    """
    Retrieve photo metadata for the specified event.
    Requires either the organizer token or a signed-in host account.
    """
    event = await EventService.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with ID '{event_id}' not found.",
        )

    authorized = EventService.verify_organizer_token(event, x_organizer_token) or EventService.is_host(
        event, current_user
    )
    if not authorized:
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
