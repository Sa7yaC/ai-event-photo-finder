"""
face_recognition (dlib-based) implementation of FaceRecognitionService.
Returns 128-dimensional face embeddings compatible with pgvector storage.
"""
import io
import logging
from typing import List, Tuple

import numpy as np

from app.ai.base import FaceRecognitionService
from app.ai.diagnostics import DetectionDiagnostic, EmbeddingDiagnostic

logger = logging.getLogger(__name__)


class DlibFaceRecognitionService(FaceRecognitionService):
    """
    Concrete face recognition provider using the `face_recognition` library (dlib HOG/CNN model).
    - Detects all faces in an image via HOG-based detector (fast, CPU-friendly).
    - Returns one 128-d embedding per detected face.
    - Embeddings are L2-normalised by dlib and directly usable with pgvector cosine/L2 search.
    """

    def extract_embeddings_with_diagnostics(
        self, image_bytes: bytes, num_jitters: int = 1
    ) -> Tuple[List[np.ndarray], List[Tuple[int, int, int, int]], DetectionDiagnostic, EmbeddingDiagnostic]:
        """
        Extract face embeddings alongside structured diagnostics.
        Returns:
            (embeddings, locations, DetectionDiagnostic, EmbeddingDiagnostic)
        """
        from app.ai.diagnostics import DetectionDiagnostic, EmbeddingDiagnostic

        det = DetectionDiagnostic(detector_model="dlib_hog")
        emb_diag = EmbeddingDiagnostic(recognition_model="dlib_resnet34", embedding_dimension=128)

        try:
            import face_recognition  # lazy import — not available in test environment
        except ImportError:
            logger.warning(
                "face_recognition library not installed. "
                "Install it with: pip install face-recognition"
            )
            det.crop_valid = False
            det.crop_rejection_reason = "face_recognition library not installed"
            return [], [], det, emb_diag

        try:
            image = face_recognition.load_image_file(io.BytesIO(image_bytes))
            det.image_decoded = True
            det.image_height, det.image_width = int(image.shape[0]), int(image.shape[1])
        except Exception as e:
            logger.exception("Failed to decode image bytes for face recognition.")
            det.image_decoded = False
            det.crop_valid = False
            det.crop_rejection_reason = f"Image decode failure: {e}"
            return [], [], det, emb_diag

        try:
            # Pass 1: Fast HOG detector (upsample=1)
            det.detector_model = "dlib_hog"
            det.upsample_passes = 1
            locations = face_recognition.face_locations(image, number_of_times_to_upsample=1, model="hog")

            # Pass 2: Profile & Angled fallback using MMOD CNN (upsample=0)
            # MMOD CNN detects faces across arbitrary yaw angles (including strict 90° profiles)
            if not locations:
                det.detector_model = "dlib_cnn"
                det.upsample_passes = 0
                locations = face_recognition.face_locations(image, number_of_times_to_upsample=0, model="cnn")

            det.faces_detected = len(locations)

            if not locations:
                logger.debug("No faces detected in image (width=%d, height=%d).", det.image_width, det.image_height)
                return [], [], det, emb_diag

            # Validate crops, clamp boundaries to image dimensions, and enforce aspect ratios
            img_h, img_w = image.shape[0], image.shape[1]
            valid_locations = []
            det.bounding_boxes = []
            det.face_sizes = []

            for raw_t, raw_r, raw_b, raw_l in locations:
                # Clamp coordinates to valid image bounds
                t = max(0, min(img_h - 1, int(raw_t)))
                b = max(0, min(img_h, int(raw_b)))
                l = max(0, min(img_w - 1, int(raw_l)))
                r = max(0, min(img_w, int(raw_r)))

                w, h = r - l, b - t
                det.bounding_boxes.append((t, r, b, l))
                det.face_sizes.append((w, h))

                if w < 12 or h < 12:
                    det.crop_valid = False
                    det.crop_rejection_reason = f"Face crop dimensions too small: {w}x{h}"
                    continue

                aspect_ratio = float(h) / float(w)
                if aspect_ratio < 0.35 or aspect_ratio > 3.0:
                    det.crop_valid = False
                    det.crop_rejection_reason = f"Extreme non-face aspect ratio: {aspect_ratio:.2f}"
                    continue

                valid_locations.append((t, r, b, l))

            if not valid_locations:
                return [], [], det, emb_diag

            # Stage 3 Landmark Alignment Stability:
            # When CNN fallback is required (HOG missed the face), it is an angled or strict profile.
            # We elevate num_jitters >= 2 to compute multiple perturbed crops and average the
            # 128-d embeddings, eliminating landmark noise from the occluded far eye.
            is_cnn_fallback = (det.detector_model == "dlib_cnn")
            det.pose_category = "strict_profile" if is_cnn_fallback else "frontal"
            effective_jitters = max(num_jitters, 2) if is_cnn_fallback else num_jitters

            # Extract 128-d embedding for each detected face
            raw_embeddings = face_recognition.face_encodings(
                image,
                known_face_locations=valid_locations,
                num_jitters=effective_jitters,
            )

            emb_diag.embeddings_generated = len(raw_embeddings)
            float_embeddings = [np.array(emb, dtype=np.float32) for emb in raw_embeddings]

            if float_embeddings:
                emb_diag.is_finite = all(bool(np.all(np.isfinite(e))) for e in float_embeddings)
                emb_diag.is_normalized = all(bool(abs(np.linalg.norm(e) - 1.0) < 0.05) for e in float_embeddings)

            logger.debug(
                "Face diagnostic: %d detected (%s, pose=%s, jitters=%d), %d encoded (finite=%s, norm=%s).",
                det.faces_detected,
                det.detector_model,
                det.pose_category,
                effective_jitters,
                emb_diag.embeddings_generated,
                emb_diag.is_finite,
                emb_diag.is_normalized,
            )
            return float_embeddings, valid_locations, det, emb_diag

        except Exception as e:
            logger.exception("Failed during face detection or embedding generation.")
            emb_diag.is_finite = False
            return [], [], det, emb_diag

    def extract_embeddings(self, image_bytes: bytes, num_jitters: int = 1) -> List[np.ndarray]:
        """
        Load image bytes, detect all faces, and return their 128-d embeddings.
        Returns an empty list if no faces are found or if the library is unavailable.
        """
        embs, _, _, _ = self.extract_embeddings_with_diagnostics(image_bytes, num_jitters=num_jitters)
        return embs

    def compare(
        self,
        probe: np.ndarray,
        candidates: List[np.ndarray],
        tolerance: float = 0.6,
    ) -> List[bool]:
        """
        Compare probe against candidates using Euclidean distance (same as dlib's face_distance).
        Returns True for each candidate whose L2 distance to the probe is ≤ tolerance.
        """
        if not candidates:
            return []
        try:
            import face_recognition
            distances = face_recognition.face_distance(candidates, probe)
            return [bool(d <= tolerance) for d in distances]
        except ImportError:
            # Fallback pure-numpy L2 distance comparison
            results = []
            for candidate in candidates:
                dist = float(np.linalg.norm(probe - candidate))
                results.append(dist <= tolerance)
            return results
