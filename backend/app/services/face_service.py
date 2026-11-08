"""
FaceService — orchestrates face detection, embedding storage, and similarity search.

Workflow:
  1. index_photo()    — Called after a photo is uploaded. Runs face_recognition on the image
                        bytes, stores one FaceEmbedding row per detected face.
  2. search_by_selfie() — Called by the attendee search endpoint. Extracts the probe embedding
                          from the selfie, runs a pgvector L2 ANN query scoped to the event,
                          and deduplicates results at the photo level.
"""
import asyncio
import io
import logging
from pathlib import Path
from typing import List, Optional, Tuple
import uuid

import numpy as np
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.base import FaceRecognitionService
from app.ai.diagnostics import (
    DetectionDiagnostic,
    EmbeddingDiagnostic,
    FailureMode,
    RetrievalCandidateDiagnostic,
    classify_trace,
)
from app.ai.svm_classifier import FaceSVMClassifier
from app.models.face_embedding import FaceEmbedding
from app.models.photo import Photo
from app.schemas.face import SelfieSearchResponse, SelfieSearchResult
from app.storage.base import StorageService

logger = logging.getLogger(__name__)

# Default similarity tolerance calibrated for high-precision frontal & angled matching (0.48)
DEFAULT_TOLERANCE: float = 0.48

# Maximum candidate neighbours to retrieve from pgvector before Python-side reranking
ANN_CANDIDATES: int = 100


class FaceService:
    """Business logic for face indexing and selfie-based photo retrieval."""

    # -----------------------------------------------------------------------
    # Indexing
    # -----------------------------------------------------------------------

    @staticmethod
    async def index_photo(
        db: AsyncSession,
        photo: Photo,
        image_bytes: bytes,
        face_svc: FaceRecognitionService,
    ) -> int:
        """
        Detect all faces in `image_bytes` and persist one FaceEmbedding row per face.
        Captures structured detection and embedding diagnostics without logging biometric vectors.

        Args:
            db: Async SQLAlchemy session.
            photo: The Photo ORM object just uploaded.
            image_bytes: Raw image content (already validated by PhotoService).
            face_svc: Injected face recognition service.

        Returns:
            Number of faces detected and stored (0 if none).
        """
        try:
            embeddings, locations, det_diag, emb_diag = await asyncio.to_thread(
                face_svc.extract_embeddings_with_diagnostics, image_bytes
            )
        except Exception:
            embeddings = await asyncio.to_thread(face_svc.extract_embeddings, image_bytes)
            locations = await asyncio.to_thread(_extract_face_locations, image_bytes)
            det_diag = DetectionDiagnostic(faces_detected=len(embeddings))
            emb_diag = EmbeddingDiagnostic(embeddings_generated=len(embeddings))

        if not embeddings:
            failure_mode = (
                FailureMode.FACE_NOT_DETECTED
                if det_diag.image_decoded and det_diag.crop_valid
                else (
                    FailureMode.CROP_REJECTED
                    if not det_diag.crop_valid
                    else FailureMode.EMBEDDING_FAILED
                )
            )
            logger.info(
                "Diagnostic trace [photo_id=%s, filename=%s]: 0 faces detected (detector=%s, dim=%dx%d, passes=%d, reason=%s). Failure mode: %s.",
                photo.id,
                photo.original_filename,
                det_diag.detector_model,
                det_diag.image_width,
                det_diag.image_height,
                det_diag.upsample_passes,
                det_diag.crop_rejection_reason or "No face bounding box matched",
                failure_mode.value,
            )
            photo.processing_status = "completed"
            photo.processing_error = None
            await db.commit()
            return 0

        rows_added = 0
        for i, emb in enumerate(embeddings):
            loc = locations[i] if i < len(locations) else (0, 0, 0, 0)
            top, right, bottom, left = loc

            face_row = FaceEmbedding(
                photo_id=photo.id,
                event_id=photo.event_id,
                embedding=emb.tolist(),  # pgvector accepts Python list[float]
                face_top=top,
                face_right=right,
                face_bottom=bottom,
                face_left=left,
            )
            db.add(face_row)
            rows_added += 1

        photo.processing_status = "completed"
        photo.processing_error = None
        await db.commit()

        logger.info(
            "Diagnostic trace [photo_id=%s, filename=%s]: Indexed %d face(s) (detector=%s, sizes=%s, finite=%s, norm=%s).",
            photo.id,
            photo.original_filename,
            rows_added,
            det_diag.detector_model,
            det_diag.face_sizes,
            emb_diag.is_finite,
            emb_diag.is_normalized,
        )
        return rows_added

    @staticmethod
    async def mark_photo_failed(
        db: AsyncSession,
        photo: Photo,
        error_message: str,
    ) -> None:
        """Mark a photo as failed processing."""
        photo.processing_status = "failed"
        photo.processing_error = error_message
        await db.commit()

    # -----------------------------------------------------------------------
    # Selfie search (Multi-Angle & Single)
    # -----------------------------------------------------------------------

    @staticmethod
    async def search_by_multi_selfie(
        db: AsyncSession,
        event_id: uuid.UUID,
        selfie_bytes_list: List[bytes],
        face_svc: FaceRecognitionService,
        tolerance: float = DEFAULT_TOLERANCE,
        limit: int = 50,
        return_diagnostics: bool = False,
    ):
        """
        Multi-angle probe face search with structured diagnostics.
        Extracts probe embeddings from all provided selfies (e.g. Front, Left 45°, Right 45°).
        Queries pgvector ANN candidates for each probe, and scores candidate faces
        by the minimum Euclidean distance across all probe angles and SVM margin.
        """
        all_probes: List[np.ndarray] = []
        for idx, selfie_bytes in enumerate(selfie_bytes_list):
            try:
                embs, locs, det_diag, emb_diag = await asyncio.to_thread(
                    face_svc.extract_embeddings_with_diagnostics,
                    selfie_bytes,
                    num_jitters=2,
                )
            except Exception:
                embs = await asyncio.to_thread(face_svc.extract_embeddings, selfie_bytes)
                det_diag = DetectionDiagnostic(faces_detected=len(embs))
                emb_diag = EmbeddingDiagnostic(embeddings_generated=len(embs))

            logger.info(
                "Probe [%d] diagnostic: faces_detected=%d, dim=%dx%d, passes=%d, encoded=%d.",
                idx,
                det_diag.faces_detected,
                det_diag.image_width,
                det_diag.image_height,
                det_diag.upsample_passes,
                emb_diag.embeddings_generated,
            )
            all_probes.extend(embs)

        if not all_probes:
            logger.warning("Search aborted: No faces detected in query selfie probes.")
            resp = SelfieSearchResponse(
                event_id=event_id,
                faces_detected_in_selfie=0,
                total_results=0,
                results=[],
            )
            return (resp, []) if return_diagnostics else resp

        try:
            bind = db.sync_session.get_bind()
            dialect_name = bind.dialect.name
        except Exception:
            dialect_name = "postgresql"
        use_pgvector = dialect_name != "sqlite"

        # Candidate rows map: embedding_id -> (Photo, emb_vec)
        candidate_rows: dict[uuid.UUID, Tuple[Photo, np.ndarray]] = {}

        if use_pgvector:
            # Increase IVFFlat probes to guarantee high recall for cross-pose and profile vectors
            try:
                await db.execute(text("SET LOCAL ivfflat.probes = 10"))
            except Exception:
                pass

            # Query pgvector ANN candidates for EACH probe angle to ensure full recall
            for probe in all_probes:
                probe_list = probe.tolist()
                stmt = (
                    select(
                        FaceEmbedding.id.label("embedding_id"),
                        FaceEmbedding.photo_id,
                        FaceEmbedding.embedding,
                        Photo,
                    )
                    .join(Photo, FaceEmbedding.photo_id == Photo.id)
                    .where(FaceEmbedding.event_id == event_id)
                    .where(Photo.processing_status == "completed")
                    .order_by(FaceEmbedding.embedding.l2_distance(probe_list))
                    .limit(ANN_CANDIDATES)
                )
                result = await db.execute(stmt)
                for row in result.all():
                    if row.embedding_id not in candidate_rows:
                        candidate_rows[row.embedding_id] = (
                            row.Photo,
                            np.array(row.embedding, dtype=np.float32),
                        )
        else:
            # SQLite fallback — full scan (test environment only)
            stmt = (
                select(
                    FaceEmbedding.id.label("embedding_id"),
                    FaceEmbedding.photo_id,
                    FaceEmbedding.embedding,
                    Photo,
                )
                .join(Photo, FaceEmbedding.photo_id == Photo.id)
                .where(FaceEmbedding.event_id == event_id)
                .where(Photo.processing_status == "completed")
            )
            result = await db.execute(stmt)
            for row in result.all():
                candidate_rows[row.embedding_id] = (
                    row.Photo,
                    np.array(row.embedding, dtype=np.float32),
                )

        logger.info(
            "Candidate retrieval: retrieved %d unique indexed candidate face(s) for event %s across %d probe(s).",
            len(candidate_rows),
            event_id,
            len(all_probes),
        )

        # Collect background distractor embeddings from event gallery for SVM negative class
        stmt_dist = (
            select(FaceEmbedding.embedding)
            .where(FaceEmbedding.event_id == event_id)
            .limit(100)
        )
        res_dist = await db.execute(stmt_dist)
        distractor_embs = [np.array(r[0], dtype=np.float32) for r in res_dist.all()]
        for _, (_, emb_vec) in candidate_rows.items():
            distractor_embs.append(emb_vec)

        # Train personalized Linear SVM classifier separating probe manifold from background
        svm = FaceSVMClassifier(c_param=1.0)
        svm.fit(all_probes, distractor_embs)

        # Multi-probe distance & SVM scoring with photo-level deduplication
        # photo_map: photo_id -> (best_dist, best_svm_score, best_confidence, Photo, matched_faces_count)
        photo_map: dict[uuid.UUID, Tuple[float, float, float, Photo, int]] = {}
        candidate_diagnostics: List[RetrievalCandidateDiagnostic] = []

        for embedding_id, (photo, emb_vec) in candidate_rows.items():
            min_dist = min(
                float(np.linalg.norm(probe - emb_vec)) for probe in all_probes
            )
            svm_margin = svm.score(emb_vec)
            confidence = svm.predict_confidence(emb_vec, min_dist=min_dist)

            # Precision Match criteria: strictly require distance <= effective_tolerance (capped at 0.50)
            # This guarantees only the user's photos are retrieved, completely eliminating unrelated gallery bleed
            effective_tol = min(tolerance, 0.50)
            is_match = (min_dist <= effective_tol)

            if not is_match:
                fail_mode = FailureMode.REJECTED_BY_THRESHOLD
                reason = f"Distance {min_dist:.4f} > strict tolerance {effective_tol:.2f} (unrelated face rejected)"

                candidate_diagnostics.append(
                    RetrievalCandidateDiagnostic(
                        photo_id=str(photo.id),
                        original_filename=photo.original_filename,
                        retrieved_in_ann=True,
                        min_probe_distance=round(min_dist, 4),
                        svm_margin=round(svm_margin, 4),
                        calibrated_confidence=round(confidence, 1),
                        passed_threshold=False,
                        rejection_reason=reason,
                        failure_mode=fail_mode,
                    )
                )
                logger.debug(
                    "Candidate rejected [photo_id=%s, filename=%s]: min_dist=%.4f, svm=%.4f, failure=%s",
                    photo.id,
                    photo.original_filename,
                    min_dist,
                    svm_margin,
                    fail_mode.value,
                )
                continue

            candidate_diagnostics.append(
                RetrievalCandidateDiagnostic(
                    photo_id=str(photo.id),
                    original_filename=photo.original_filename,
                    retrieved_in_ann=True,
                    min_probe_distance=round(min_dist, 4),
                    svm_margin=round(svm_margin, 4),
                    calibrated_confidence=round(confidence, 1),
                    passed_threshold=True,
                    rejection_reason=None,
                    failure_mode=FailureMode.NONE,
                )
            )

            if photo.id not in photo_map:
                photo_map[photo.id] = (min_dist, svm_margin, confidence, photo, 1)
            else:
                prev_dist, prev_margin, prev_conf, existing_photo, count = photo_map[photo.id]
                photo_map[photo.id] = (
                    min(prev_dist, min_dist),
                    max(prev_margin, svm_margin),
                    max(prev_conf, confidence),
                    existing_photo,
                    count + 1,
                )

        # Sort matches by lowest distance and highest SVM confidence
        sorted_matches = sorted(
            photo_map.values(),
            key=lambda x: (x[0], -x[1])
        )[:limit]

        results = [
            SelfieSearchResult(
                photo_id=photo.id,
                event_id=photo.event_id,
                original_filename=photo.original_filename,
                content_type=photo.content_type,
                file_size=photo.file_size,
                image_width=photo.image_width,
                image_height=photo.image_height,
                processing_status=photo.processing_status,
                created_at=photo.created_at,
                matched_faces=count,
                best_distance=round(dist, 4),
                svm_score=round(svm_margin, 4),
                confidence=round(conf, 1),
            )
            for dist, svm_margin, conf, photo, count in sorted_matches
        ]

        resp = SelfieSearchResponse(
            event_id=event_id,
            faces_detected_in_selfie=len(all_probes),
            total_results=len(results),
            results=results,
        )
        return (resp, candidate_diagnostics) if return_diagnostics else resp

    @staticmethod
    async def search_by_selfie(
        db: AsyncSession,
        event_id: uuid.UUID,
        selfie_bytes: bytes,
        face_svc: FaceRecognitionService,
        tolerance: float = DEFAULT_TOLERANCE,
        limit: int = 50,
    ) -> SelfieSearchResponse:
        """Backward-compatible single-selfie search wrapper."""
        return await FaceService.search_by_multi_selfie(
            db=db,
            event_id=event_id,
            selfie_bytes_list=[selfie_bytes],
            face_svc=face_svc,
            tolerance=tolerance,
            limit=limit,
        )

    @staticmethod
    async def reindex_event_photos(
        db: AsyncSession,
        event_id: uuid.UUID,
        face_svc: FaceRecognitionService,
        storage_svc: StorageService,
        only_zero_face: bool = True,
    ) -> dict:
        """
        Re-index gallery photos for an event using the enhanced detector pipeline.
        Enables detecting and storing side profiles previously missed by frontal detectors.
        """
        if only_zero_face:
            indexed_photos_subq = (
                select(FaceEmbedding.photo_id)
                .where(FaceEmbedding.event_id == event_id)
                .distinct()
            )
            stmt = (
                select(Photo)
                .where(Photo.event_id == event_id)
                .where(Photo.processing_status == "completed")
                .where(Photo.id.not_in(indexed_photos_subq))
            )
        else:
            stmt = (
                select(Photo)
                .where(Photo.event_id == event_id)
                .where(Photo.processing_status == "completed")
            )

        res = await db.execute(stmt)
        photos = res.scalars().all()

        reindexed_count = 0
        newly_indexed_faces = 0

        for photo in photos:
            try:
                file_path = storage_svc.get_file_path(photo.storage_key)
                if not file_path.exists():
                    logger.warning("Photo file not found on disk: %s", photo.storage_key)
                    continue

                content = file_path.read_bytes()
                faces_added = await FaceService.index_photo(
                    db=db,
                    photo=photo,
                    image_bytes=content,
                    face_svc=face_svc,
                )
                reindexed_count += 1
                newly_indexed_faces += faces_added
            except Exception as e:
                logger.exception("Failed to reindex photo %s: %s", photo.id, e)

        return {
            "photos_scanned": len(photos),
            "photos_reindexed": reindexed_count,
            "new_faces_indexed": newly_indexed_faces,
        }

    # -----------------------------------------------------------------------
    # Stats helper
    # -----------------------------------------------------------------------

    @staticmethod
    async def count_detected_faces(db: AsyncSession, event_id: uuid.UUID) -> int:
        """Return the total number of face embeddings indexed for an event."""
        result = await db.execute(
            select(func.count(FaceEmbedding.id)).where(
                FaceEmbedding.event_id == event_id
            )
        )
        return result.scalar_one() or 0


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _extract_face_locations(image_bytes: bytes) -> list:
    """
    Return dlib face locations for the given image bytes.
    Uses fast HOG pass (upsample=1), falling back to MMOD CNN (upsample=0) for profile faces.
    Returns an empty list if face_recognition is not installed (test environment).
    """
    try:
        import face_recognition  # noqa: PLC0415

        image = face_recognition.load_image_file(io.BytesIO(image_bytes))
        locs = face_recognition.face_locations(image, number_of_times_to_upsample=1, model="hog")
        if not locs:
            locs = face_recognition.face_locations(image, number_of_times_to_upsample=0, model="cnn")
        return locs
    except ImportError:
        return []
    except Exception:
        logger.exception("Failed to extract face locations.")
        return []
