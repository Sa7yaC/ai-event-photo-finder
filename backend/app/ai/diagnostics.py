"""
Pipeline Instrumentation & Diagnostic Tracing.

Provides structured diagnostic dataclasses and evaluation methods to trace
photographs through Detection, Embedding, and Retrieval stages without logging
raw biometric vector data.
"""
from dataclasses import dataclass, field
from enum import Enum
import logging
from typing import List, Optional, Tuple
import numpy as np

logger = logging.getLogger(__name__)


class FailureMode(str, Enum):
    NONE = "none"
    FACE_NOT_DETECTED = "1_gallery_face_not_detected"
    CROP_REJECTED = "2_crop_rejected"
    EMBEDDING_FAILED = "3_embedding_generation_failed"
    SIMILARITY_INSUFFICIENT = "4_similarity_insufficient"
    CANDIDATE_OMITTED_ANN = "5_candidate_omitted_by_vector_search"
    REJECTED_BY_THRESHOLD = "6_candidate_rejected_by_threshold"
    REMOVED_POST_PROCESSING = "7_candidate_removed_by_post_processing"
    IMPLEMENTATION_DEFECT = "8_implementation_defect"


@dataclass
class DetectionDiagnostic:
    image_decoded: bool = False
    image_width: int = 0
    image_height: int = 0
    detector_model: str = "dlib_hog"
    upsample_passes: int = 1
    faces_detected: int = 0
    bounding_boxes: List[Tuple[int, int, int, int]] = field(default_factory=list)  # (top, right, bottom, left)
    face_sizes: List[Tuple[int, int]] = field(default_factory=list)  # (width, height)
    crop_valid: bool = True
    crop_rejection_reason: Optional[str] = None
    pose_category: str = "unknown"  # "frontal", "angled", "strict_profile"
    symmetry_score: float = 1.0


@dataclass
class EmbeddingDiagnostic:
    recognition_model: str = "dlib_resnet34"
    embedding_dimension: int = 128
    embeddings_generated: int = 0
    is_finite: bool = True
    is_normalized: bool = True
    persisted_to_db: bool = False


@dataclass
class RetrievalCandidateDiagnostic:
    photo_id: str
    original_filename: str
    ground_truth_match: Optional[bool] = None
    retrieved_in_ann: bool = False
    min_probe_distance: float = 999.0
    svm_margin: float = 0.0
    calibrated_confidence: float = 0.0
    passed_threshold: bool = False
    rejection_reason: Optional[str] = None
    failure_mode: FailureMode = FailureMode.NONE


@dataclass
class TraceRecord:
    photo_id: str
    filename: str
    pose_category: str = "unknown"  # "frontal", "slight_angle", "moderate_angle", "strict_profile"
    detection: DetectionDiagnostic = field(default_factory=DetectionDiagnostic)
    embedding: EmbeddingDiagnostic = field(default_factory=EmbeddingDiagnostic)
    retrieval: Optional[RetrievalCandidateDiagnostic] = None
    dominant_failure: FailureMode = FailureMode.NONE


def classify_trace(
    detection: DetectionDiagnostic,
    embedding: EmbeddingDiagnostic,
    retrieval: Optional[RetrievalCandidateDiagnostic] = None,
) -> FailureMode:
    """
    Deterministically classify a trace record into one of the 8 canonical failure modes.
    """
    if not detection.image_decoded:
        return FailureMode.CROP_REJECTED
    if not detection.crop_valid:
        return FailureMode.CROP_REJECTED
    if detection.faces_detected == 0:
        return FailureMode.FACE_NOT_DETECTED
    if embedding.embeddings_generated == 0 or not embedding.is_finite:
        return FailureMode.EMBEDDING_FAILED
    if retrieval is not None:
        if not retrieval.retrieved_in_ann:
            return FailureMode.CANDIDATE_OMITTED_ANN
        if not retrieval.passed_threshold:
            if retrieval.min_probe_distance > 0.85:
                return FailureMode.SIMILARITY_INSUFFICIENT
            return FailureMode.REJECTED_BY_THRESHOLD
    return FailureMode.NONE
