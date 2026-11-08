from datetime import date, datetime
from typing import Optional
import uuid
from pydantic import BaseModel, Field, field_validator


class EventCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Event name")
    description: Optional[str] = Field(None, max_length=2000, description="Optional event description")
    event_date: Optional[date] = Field(None, description="Event date (YYYY-MM-DD)")

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Event name cannot be empty or whitespace only")
        return cleaned


class EventResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    event_date: Optional[date] = None
    slug: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EventCreatedResponse(EventResponse):
    organizer_token: str = Field(
        ...,
        description="Secret management token. Save this token to manage or upload photos to the event."
    )


class EventStatsResponse(BaseModel):
    event_id: uuid.UUID
    event_name: str
    total_photos: int = 0
    processed_photos: int = 0
    pending_photos: int = 0
    failed_photos: int = 0
    detected_faces: int = 0
