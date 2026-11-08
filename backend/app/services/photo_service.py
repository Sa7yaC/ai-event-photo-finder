import hashlib
import io
import logging
from typing import List, Optional, Tuple
import uuid
from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.models.event import Event
from app.models.photo import Photo
from app.schemas.photo import (
    PhotoBatchUploadResponse,
    PhotoResponse,
    PhotoUploadItemResult,
)
from app.storage.base import StorageService

logger = logging.getLogger(__name__)

# Valid MIME types & Pillow formats
ALLOWED_FORMATS = {
    "JPEG": "image/jpeg",
    "JPG": "image/jpeg",
    "MPO": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
}


class PhotoService:
    @staticmethod
    def validate_image_data(content: bytes) -> Tuple[str, int, int]:
        """
        Validate image data using Pillow to inspect magic bytes and internal header.
        Returns: (mime_type, width, height)
        Raises: ValueError if invalid, corrupted, or unsupported.
        """
        try:
            with Image.open(io.BytesIO(content)) as img:
                fmt = img.format
                if fmt not in ALLOWED_FORMATS:
                    raise ValueError(
                        f"Unsupported image format: {fmt}. Allowed formats: JPG, JPEG, PNG, WEBP."
                    )
                # Verify image can be parsed without truncation
                img.verify()
                
            # Re-open after verify() to read valid dimensions
            with Image.open(io.BytesIO(content)) as img:
                width, height = img.size
                mime_type = ALLOWED_FORMATS[fmt]
                return mime_type, width, height
        except UnidentifiedImageError:
            raise ValueError("File is not a valid or recognizable image.")
        except Exception as e:
            raise ValueError(f"Corrupted or invalid image: {str(e)}")

    @classmethod
    async def upload_photos(
        cls,
        db: AsyncSession,
        event: Event,
        files: List[UploadFile],
        storage: StorageService,
        face_svc=None,  # Optional[FaceRecognitionService] — injected at call site
    ) -> PhotoBatchUploadResponse:
        results: List[PhotoUploadItemResult] = []
        total_uploaded = 0
        total_duplicates = 0
        total_failed = 0

        for file in files:
            filename = file.filename or "unknown.jpg"
            try:
                # 1. Read content
                content = await file.read()
                file_size = len(content)

                # 2. Check file size
                if file_size == 0:
                    results.append(
                        PhotoUploadItemResult(
                            filename=filename,
                            status="failed",
                            message="File is empty (0 bytes).",
                        )
                    )
                    total_failed += 1
                    continue

                if file_size > settings.MAX_UPLOAD_SIZE_BYTES:
                    max_mb = settings.MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)
                    results.append(
                        PhotoUploadItemResult(
                            filename=filename,
                            status="failed",
                            message=f"File exceeds maximum allowed size of {max_mb:.1f} MB.",
                        )
                    )
                    total_failed += 1
                    continue

                # 3. Validate image content & format
                try:
                    content_type, width, height = cls.validate_image_data(content)
                except ValueError as err:
                    results.append(
                        PhotoUploadItemResult(
                            filename=filename,
                            status="failed",
                            message=str(err),
                        )
                    )
                    total_failed += 1
                    continue

                # 4. Calculate content hash (SHA-256)
                content_hash = hashlib.sha256(content).hexdigest()

                # 5. Check duplicate within the event
                existing_result = await db.execute(
                    select(Photo).where(
                        Photo.event_id == event.id,
                        Photo.content_hash == content_hash,
                    )
                )
                existing_photo = existing_result.scalar_one_or_none()

                if existing_photo:
                    results.append(
                        PhotoUploadItemResult(
                            filename=filename,
                            status="duplicate",
                            photo_id=existing_photo.id,
                            message="Photo has already been uploaded to this event.",
                        )
                    )
                    total_duplicates += 1
                    continue

                # 6. Save image to storage under events/{event_id}/
                subfolder = f"events/{event.id}"
                storage_key = await storage.save_file(
                    content=content,
                    filename=filename,
                    subfolder=subfolder,
                )

                # 7. Create Photo record
                photo = Photo(
                    event_id=event.id,
                    original_filename=filename,
                    storage_key=storage_key,
                    content_type=content_type,
                    file_size=file_size,
                    image_width=width,
                    image_height=height,
                    content_hash=content_hash,
                    processing_status="pending",
                )
                db.add(photo)
                await db.commit()
                await db.refresh(photo)

                results.append(
                    PhotoUploadItemResult(
                        filename=filename,
                        status="uploaded",
                        photo_id=photo.id,
                        message="Uploaded successfully.",
                    )
                )
                total_uploaded += 1

                # --- Stage 3: Face indexing ---
                # Run face detection inline after each successful upload.
                # Errors are non-fatal: a face-detection failure will not
                # fail the upload; the photo will be marked accordingly.
                if face_svc is not None:
                    try:
                        from app.services.face_service import FaceService  # noqa: PLC0415
                        await FaceService.index_photo(db, photo, content, face_svc)
                    except Exception:
                        logger.exception(
                            "Face indexing failed for photo %s — marking as failed.",
                            photo.id,
                        )
                        try:
                            from app.services.face_service import FaceService  # noqa: PLC0415
                            await FaceService.mark_photo_failed(
                                db, photo, "Face indexing error."
                            )
                        except Exception:
                            pass  # best-effort status update

            except Exception as e:
                logger.exception("Unexpected error processing file %s", filename)
                results.append(
                    PhotoUploadItemResult(
                        filename=filename,
                        status="failed",
                        message=f"Processing error: {str(e)}",
                    )
                )
                total_failed += 1

        return PhotoBatchUploadResponse(
            total_received=len(files),
            total_uploaded=total_uploaded,
            total_duplicates=total_duplicates,
            total_failed=total_failed,
            results=results,
        )

    @staticmethod
    async def list_event_photos(
        db: AsyncSession,
        event_id: uuid.UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[int, List[Photo]]:
        # Total count
        count_res = await db.execute(
            select(func.count(Photo.id)).where(Photo.event_id == event_id)
        )
        total = count_res.scalar_one()

        # Paginated items
        items_res = await db.execute(
            select(Photo)
            .where(Photo.event_id == event_id)
            .order_by(Photo.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        photos = list(items_res.scalars().all())
        return total, photos

    @staticmethod
    async def get_photo_by_id(db: AsyncSession, photo_id: uuid.UUID) -> Optional[Photo]:
        result = await db.execute(select(Photo).where(Photo.id == photo_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def delete_photo(
        db: AsyncSession,
        photo: Photo,
        storage: StorageService,
    ) -> bool:
        # Delete from storage first
        await storage.delete_file(photo.storage_key)
        # Delete database row
        await db.delete(photo)
        await db.commit()
        return True

    @staticmethod
    async def reindex_event_photos(
        db: AsyncSession,
        event_id: uuid.UUID,
        storage: StorageService,
        face_svc,
    ) -> dict:
        """
        Re-index all photos in an event using the active face recognition model.
        Deletes existing face embeddings and re-extracts embeddings from stored original photos.
        """
        from app.models.face_embedding import FaceEmbedding
        from app.services.face_service import FaceService

        photos = (
            await db.execute(select(Photo).where(Photo.event_id == event_id))
        ).scalars().all()

        # Remove existing face embeddings for event
        await db.execute(
            FaceEmbedding.__table__.delete().where(FaceEmbedding.event_id == event_id)
        )

        total_faces = 0
        photos_processed = 0

        for photo in photos:
            try:
                full_path = storage.get_file_path(photo.storage_key)
                content = full_path.read_bytes()
                faces = await FaceService.index_photo(db, photo, content, face_svc)
                total_faces += faces
                photos_processed += 1
            except Exception as exc:
                logger.warning("Failed to re-index photo %s: %s", photo.id, exc)

        return {
            "event_id": str(event_id),
            "photos_reindexed": photos_processed,
            "total_faces_detected": total_faces,
        }
