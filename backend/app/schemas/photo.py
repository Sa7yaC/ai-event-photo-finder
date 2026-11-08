from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, Field


class PhotoResponse(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    original_filename: str
    content_type: str
    file_size: int
    image_width: Optional[int] = None
    image_height: Optional[int] = None
    processing_status: str
    processing_error: Optional[str] = None
    created_at: datetime
    processed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PhotoUploadItemResult(BaseModel):
    filename: str
    status: str = Field(..., description="'uploaded', 'duplicate', or 'failed'")
    photo_id: Optional[uuid.UUID] = None
    message: Optional[str] = None


class PhotoBatchUploadResponse(BaseModel):
    total_received: int
    total_uploaded: int
    total_duplicates: int
    total_failed: int
    results: List[PhotoUploadItemResult]


class PhotoListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: List[PhotoResponse]
