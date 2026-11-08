"""
Attendee selfie search endpoint.
POST /api/v1/events/{event_id}/search — Upload a selfie to find all photos in the event
containing your face.
"""
import logging
from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai import FaceRecognitionService, get_face_recognition_service
from app.core.database import get_db
from app.schemas.face import SelfieSearchResponse
from app.services.event_service import EventService
from app.services.face_service import FaceService
from app.services.photo_service import PhotoService

logger = logging.getLogger(__name__)
router = APIRouter()

# Maximum selfie upload size: 10 MB per image
MAX_SELFIE_SIZE_BYTES: int = 10 * 1024 * 1024


@router.post(
    "/{event_id}/search",
    response_model=SelfieSearchResponse,
    summary="Find your photos by selfie (single or multi-angle)",
    tags=["Search"],
)
async def search_photos_by_selfie(
    event_id: uuid.UUID,
    selfie: Optional[UploadFile] = File(None, description="Single selfie probe"),
    files: Optional[List[UploadFile]] = File(None, description="Multiple selfie probes (e.g. Front, Left, Right)"),
    tolerance: float = Query(
        default=0.48,
        ge=0.2,
        le=0.8,
        description=(
            "Face similarity tolerance. Lower = stricter matching. "
            "0.48 provides high precision for frontal and angled matches with zero false-positive bleed."
        ),
    ),
    limit: int = Query(default=50, ge=1, le=200, description="Maximum number of photos to return"),
    db: AsyncSession = Depends(get_db),
    face_svc: FaceRecognitionService = Depends(get_face_recognition_service),
) -> SelfieSearchResponse:
    """
    **Attendee selfie photo search (Multi-Angle Capable).**

    Upload one or multiple selfies (e.g. Front, Left 45°, Right 45°) to search all
    indexed photos in the event.

    - Multi-angle matching checks candidate photos against all uploaded probe vectors,
      ensuring side profiles and angled shots in the gallery are accurately matched.
    - Results are sorted by similarity confidence (closest match first).
    - Privacy: Selfies are processed in memory only — never stored.
    """
    # 1. Verify event exists
    event = await EventService.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with ID '{event_id}' not found.",
        )

    # 2. Gather all submitted selfie files
    incoming_files: List[UploadFile] = []
    if files:
        incoming_files.extend(files)
    if selfie:
        incoming_files.append(selfie)

    if not incoming_files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No selfie image provided. Please upload at least one selfie.",
        )

    selfie_bytes_list: List[bytes] = []
    for file_item in incoming_files:
        content = await file_item.read()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selfie file is empty.",
            )
        if len(content) > MAX_SELFIE_SIZE_BYTES:
            max_mb = MAX_SELFIE_SIZE_BYTES // (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Selfie exceeds maximum allowed size of {max_mb} MB.",
            )
        try:
            PhotoService.validate_image_data(content)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid selfie image: {exc}",
            )
        selfie_bytes_list.append(content)

    # 3. Run multi-selfie search in memory
    logger.info(
        "Selfie search initiated for event %s with %d probe image(s) (tolerance=%.2f)",
        event_id,
        len(selfie_bytes_list),
        tolerance,
    )
    return await FaceService.search_by_multi_selfie(
        db=db,
        event_id=event_id,
        selfie_bytes_list=selfie_bytes_list,
        face_svc=face_svc,
        tolerance=tolerance,
        limit=limit,
    )
