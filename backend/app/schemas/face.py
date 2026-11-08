"""
Pydantic schemas for face embedding and selfie search request/response.
"""
from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, Field


class FaceEmbeddingResponse(BaseModel):
    """Metadata for a single face detected within a photo."""
    id: uuid.UUID
    photo_id: uuid.UUID
    event_id: uuid.UUID
    face_top: int
    face_right: int
    face_bottom: int
    face_left: int
    created_at: datetime

    model_config = {"from_attributes": True}


class SelfieSearchResult(BaseModel):
    """A single photo matched by selfie facial similarity search."""
    photo_id: uuid.UUID
    event_id: uuid.UUID
    original_filename: str
    content_type: str
    file_size: int
    image_width: Optional[int] = None
    image_height: Optional[int] = None
    processing_status: str
    created_at: datetime
    # Number of face embeddings in this photo that matched the probe
    matched_faces: int = Field(default=1, description="Number of face matches in this photo")
    # Euclidean distance of the closest matching face (lower = more similar)
    best_distance: Optional[float] = Field(
        default=None,
        description="Euclidean distance of the closest face match (0.0 = identical, <0.6 = match)"
    )
    # SVM classification margin (>0 indicates matched class)
    svm_score: Optional[float] = Field(
        default=None,
        description="SVM decision function margin (>0 = positive match)"
    )
    # Calibrated match probability / confidence percentage [50-99%]
    confidence: Optional[float] = Field(
        default=None,
        description="Calibrated match confidence percentage [50-99%]"
    )

    model_config = {"from_attributes": True}


class SelfieSearchResponse(BaseModel):
    """Response payload for a selfie face-search query."""
    event_id: uuid.UUID
    faces_detected_in_selfie: int = Field(
        description="Number of faces found in the uploaded selfie (expected: 1)"
    )
    total_results: int = Field(description="Total number of matching photos found")
    results: List[SelfieSearchResult]
