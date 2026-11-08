"""
FaceEmbedding model — stores one 128-d face vector per detected face per photo.
Uses pgvector for high-performance approximate nearest-neighbour (ANN) search.
"""
from datetime import datetime, timezone
import uuid
from sqlalchemy import DateTime, ForeignKey, Integer, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
from app.models.base import Base


class FaceEmbedding(Base):
    """
    One row per face detected within a photo.
    A single photo may contain multiple faces (group shots), each stored as a separate row.
    The 128-d vector produced by dlib (face_recognition) is stored in the `embedding` column
    and indexed via an IVFFlat index for sub-linear ANN cosine search.
    """

    __tablename__ = "face_embeddings"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    photo_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("photos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # 128-d dlib face embedding vector (pgvector type)
    embedding: Mapped[list] = mapped_column(Vector(128), nullable=False)

    # Face bounding-box coordinates within the image (top, right, bottom, left in pixels)
    face_top: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    face_right: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    face_bottom: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    face_left: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    photo: Mapped["Photo"] = relationship("Photo", back_populates="face_embeddings")
    event: Mapped["Event"] = relationship("Event", back_populates="face_embeddings")

    def __repr__(self) -> str:
        return f"<FaceEmbedding id={self.id} photo_id={self.photo_id} event_id={self.event_id}>"
