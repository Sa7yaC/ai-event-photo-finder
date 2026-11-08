"""
Abstract AI provider interface for face recognition.
Swap implementations by changing the concrete class returned by get_face_recognition_service().
"""
from abc import ABC, abstractmethod
from typing import List, Optional
import numpy as np


class FaceRecognitionService(ABC):
    """Abstract interface for face detection and embedding extraction."""

    @abstractmethod
    def extract_embeddings(self, image_bytes: bytes) -> List[np.ndarray]:
        """
        Detect all faces in an image and return a list of 128-d embedding vectors.

        Args:
            image_bytes: Raw image bytes (JPEG/PNG/WEBP).

        Returns:
            List of numpy arrays (shape: (128,) each). Empty list if no faces detected.
        """
        pass

    @abstractmethod
    def compare(
        self,
        probe: np.ndarray,
        candidates: List[np.ndarray],
        tolerance: float = 0.6,
    ) -> List[bool]:
        """
        Compare a probe embedding against a list of candidate embeddings.

        Args:
            probe: Single 128-d embedding from a selfie.
            candidates: List of stored 128-d embeddings.
            tolerance: Distance threshold (lower = stricter). Default 0.6 is standard dlib tolerance.

        Returns:
            List of booleans — True where the candidate matches the probe.
        """
        pass

    def extract_embeddings_with_diagnostics(
        self, image_bytes: bytes, num_jitters: int = 1
    ):
        """
        Extract embeddings with structured detection and embedding diagnostics.
        Default implementation wraps extract_embeddings for backward compatibility.
        """
        from app.ai.diagnostics import DetectionDiagnostic, EmbeddingDiagnostic

        embs = self.extract_embeddings(image_bytes)
        det = DetectionDiagnostic(
            image_decoded=bool(image_bytes),
            faces_detected=len(embs),
            bounding_boxes=[(0, 0, 0, 0)] * len(embs),
            face_sizes=[(0, 0)] * len(embs),
        )
        is_finite = all(bool(np.all(np.isfinite(e))) for e in embs) if embs else True
        is_norm = all(bool(abs(np.linalg.norm(e) - 1.0) < 0.05) for e in embs) if embs else True
        emb_diag = EmbeddingDiagnostic(
            embeddings_generated=len(embs),
            is_finite=is_finite,
            is_normalized=is_norm,
        )
        dummy_locs = [(0, 0, 0, 0)] * len(embs)
        return embs, dummy_locs, det, emb_diag
