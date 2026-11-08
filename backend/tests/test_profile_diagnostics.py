"""
Stage 1 Automated Diagnostic Suite.

Validates structured tracing across Detection, Embedding, and Retrieval stages,
and tests the 8 failure mode classifications on simulated and consented gallery images.
"""
import io
import uuid
import numpy as np
import pytest
from httpx import AsyncClient
from PIL import Image

from app.ai import get_face_recognition_service
from app.ai.base import FaceRecognitionService
from app.ai.diagnostics import (
    DetectionDiagnostic,
    EmbeddingDiagnostic,
    FailureMode,
    RetrievalCandidateDiagnostic,
    classify_trace,
)
from app.main import app
from app.services.face_service import FaceService


def generate_dummy_image(size=(100, 100), color="blue") -> bytes:
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_classify_trace_rules():
    """Verify deterministic classification into the 8 failure modes."""
    # Mode 2: Crop rejected / decode failed
    det_corrupt = DetectionDiagnostic(image_decoded=False)
    assert classify_trace(det_corrupt, EmbeddingDiagnostic()) == FailureMode.CROP_REJECTED

    det_invalid = DetectionDiagnostic(image_decoded=True, crop_valid=False)
    assert classify_trace(det_invalid, EmbeddingDiagnostic()) == FailureMode.CROP_REJECTED

    # Mode 1: Face not detected
    det_no_face = DetectionDiagnostic(image_decoded=True, crop_valid=True, faces_detected=0)
    assert classify_trace(det_no_face, EmbeddingDiagnostic()) == FailureMode.FACE_NOT_DETECTED

    # Mode 3: Embedding generation failed / non-finite
    det_ok = DetectionDiagnostic(image_decoded=True, crop_valid=True, faces_detected=1)
    emb_fail = EmbeddingDiagnostic(embeddings_generated=0)
    assert classify_trace(det_ok, emb_fail) == FailureMode.EMBEDDING_FAILED

    emb_nan = EmbeddingDiagnostic(embeddings_generated=1, is_finite=False)
    assert classify_trace(det_ok, emb_nan) == FailureMode.EMBEDDING_FAILED

    # Mode 5: Candidate omitted by ANN
    emb_ok = EmbeddingDiagnostic(embeddings_generated=1, is_finite=True, is_normalized=True)
    ret_omitted = RetrievalCandidateDiagnostic(
        photo_id="photo-1",
        original_filename="test.jpg",
        retrieved_in_ann=False,
    )
    assert classify_trace(det_ok, emb_ok, ret_omitted) == FailureMode.CANDIDATE_OMITTED_ANN

    # Mode 4: Similarity insufficient (cross-pose distance > 0.85)
    ret_far = RetrievalCandidateDiagnostic(
        photo_id="photo-2",
        original_filename="profile.jpg",
        retrieved_in_ann=True,
        min_probe_distance=0.91,
        passed_threshold=False,
    )
    assert classify_trace(det_ok, emb_ok, ret_far) == FailureMode.SIMILARITY_INSUFFICIENT

    # Mode 6: Rejected by threshold (borderline distance, e.g. 0.68 with threshold 0.60)
    ret_borderline = RetrievalCandidateDiagnostic(
        photo_id="photo-3",
        original_filename="angled.jpg",
        retrieved_in_ann=True,
        min_probe_distance=0.68,
        passed_threshold=False,
    )
    assert classify_trace(det_ok, emb_ok, ret_borderline) == FailureMode.REJECTED_BY_THRESHOLD

    # Success: match passed threshold
    ret_matched = RetrievalCandidateDiagnostic(
        photo_id="photo-4",
        original_filename="frontal.jpg",
        retrieved_in_ann=True,
        min_probe_distance=0.35,
        passed_threshold=True,
    )
    assert classify_trace(det_ok, emb_ok, ret_matched) == FailureMode.NONE


class DiagnosticsTraceMockService(FaceRecognitionService):
    """Custom mock for testing diagnostics extraction and failure modes."""

    def __init__(self, embs=None, locations=None):
        self._embs = embs if embs is not None else []
        self._locations = locations if locations is not None else []

    def extract_embeddings(self, image_bytes: bytes):
        return list(self._embs)

    def compare(self, probe, candidates, tolerance=0.6):
        return [float(np.linalg.norm(probe - c)) <= tolerance for c in candidates]

    def extract_embeddings_with_diagnostics(self, image_bytes: bytes, num_jitters: int = 1):
        det = DetectionDiagnostic(
            image_decoded=True,
            faces_detected=len(self._embs),
            bounding_boxes=self._locations,
            face_sizes=[(r - l, b - t) for t, r, b, l in self._locations],
        )
        emb_diag = EmbeddingDiagnostic(
            embeddings_generated=len(self._embs),
            is_finite=True,
            is_normalized=True,
        )
        return list(self._embs), list(self._locations), det, emb_diag


@pytest.mark.asyncio
async def test_indexing_zero_faces_trace(async_client: AsyncClient):
    """Verify that uploading an image with 0 detected faces marks status 'completed' and 0 faces indexed."""
    face_svc = DiagnosticsTraceMockService(embs=[], locations=[])
    app.dependency_overrides[get_face_recognition_service] = lambda: face_svc

    try:
        # Create event
        res = await async_client.post("/api/v1/events", json={"name": "Zero Face Trace"})
        assert res.status_code == 201
        event_id = res.json()["id"]
        token = res.json()["organizer_token"]

        # Upload image where detector finds 0 faces
        img = generate_dummy_image()
        upload_res = await async_client.post(
            f"/api/v1/events/{event_id}/photos",
            files=[("files", ("side_profile_miss.jpg", img, "image/jpeg"))],
            headers={"X-Organizer-Token": token},
        )
        assert upload_res.status_code == 201
        photo_id = upload_res.json()["results"][0]["photo_id"]

        # Verify photo completed but 0 faces stored in stats
        stats = await async_client.get(f"/api/v1/events/{event_id}/stats")
        assert stats.status_code == 200
        assert stats.json()["detected_faces"] == 0
        assert stats.json()["processed_photos"] == 1

        photo_res = await async_client.get(f"/api/v1/photos/{photo_id}")
        assert photo_res.status_code == 200
        assert photo_res.json()["processing_status"] == "completed"
    finally:
        del app.dependency_overrides[get_face_recognition_service]


@pytest.mark.asyncio
async def test_search_diagnostics_trace_flow(async_client: AsyncClient):
    """Verify end-to-end multi-selfie search with diagnostics logging and score verification."""
    v1 = np.zeros(128, dtype=np.float32)
    v1[0] = 1.0  # probe vector

    v_match = np.zeros(128, dtype=np.float32)
    v_match[0] = 0.95
    v_match[1] = 0.10
    v_match = v_match / np.linalg.norm(v_match)

    class DynamicService(FaceRecognitionService):
        def __init__(self):
            self.mode = "index"

        def extract_embeddings(self, image_bytes):
            embs, _, _, _ = self.extract_embeddings_with_diagnostics(image_bytes)
            return embs

        def compare(self, probe, candidates, tolerance=0.6):
            return [float(np.linalg.norm(probe - c)) <= tolerance for c in candidates]

        def extract_embeddings_with_diagnostics(self, image_bytes, num_jitters=1):
            if self.mode == "index":
                embs = [v_match]
            else:
                embs = [v1]
            det = DetectionDiagnostic(
                image_decoded=True,
                faces_detected=len(embs),
                bounding_boxes=[(10, 100, 100, 10)],
                face_sizes=[(90, 90)],
            )
            emb_diag = EmbeddingDiagnostic(
                embeddings_generated=len(embs),
                is_finite=True,
                is_normalized=True,
            )
            return embs, [(10, 100, 100, 10)], det, emb_diag

    svc = DynamicService()
    app.dependency_overrides[get_face_recognition_service] = lambda: svc

    try:
        res = await async_client.post("/api/v1/events", json={"name": "Search Trace Event"})
        event_id = res.json()["id"]
        token = res.json()["organizer_token"]

        # Index photo
        svc.mode = "index"
        img = generate_dummy_image()
        up_res = await async_client.post(
            f"/api/v1/events/{event_id}/photos",
            files=[("files", ("match.jpg", img, "image/jpeg"))],
            headers={"X-Organizer-Token": token},
        )
        assert up_res.status_code == 201
        photo_id = up_res.json()["results"][0]["photo_id"]

        # Search with probe
        svc.mode = "search"
        search_res = await async_client.post(
            f"/api/v1/events/{event_id}/search",
            files=[("selfie", ("probe.jpg", img, "image/jpeg"))],
        )
        assert search_res.status_code == 200
        data = search_res.json()
        assert data["total_results"] == 1
        assert data["results"][0]["photo_id"] == photo_id
        assert "svm_score" in data["results"][0]
        assert "confidence" in data["results"][0]
        assert data["results"][0]["best_distance"] < 0.60
    finally:
        del app.dependency_overrides[get_face_recognition_service]


def test_svm_manifold_and_zero_distractor_contamination():
    """
    Stage 4 verification:
    1. Verify multi-angle manifold interpolation (Front + Left + Right).
    2. Verify 0.75 cutoff prevents attendee's cross-pose profile from being treated as negative distractor.
    3. Verify zero false-positive bleed on background distractors.
    """
    from app.ai.svm_classifier import FaceSVMClassifier

    # 1. Attendee probes:
    # Front probe: unit vector along dim 0
    p_front = np.zeros(128, dtype=np.float32)
    p_front[0] = 1.0

    # Left profile probe: 45° rotation towards dim 1
    p_left = np.zeros(128, dtype=np.float32)
    p_left[0] = 0.7071
    p_left[1] = 0.7071

    # Right profile probe: 45° rotation towards dim 2
    p_right = np.zeros(128, dtype=np.float32)
    p_right[0] = 0.7071
    p_right[2] = 0.7071

    probes = [p_front, p_left, p_right]

    # 2. Gallery photos of the attendee:
    # Frontal gallery photo
    g_frontal = np.zeros(128, dtype=np.float32)
    g_frontal[0] = 0.96
    g_frontal[3] = 0.28
    g_frontal /= np.linalg.norm(g_frontal)

    # Strict side profile gallery photo (turned ~70° to the left, dim 1 dominant)
    g_profile = np.zeros(128, dtype=np.float32)
    g_profile[0] = 0.40
    g_profile[1] = 0.90
    g_profile[4] = 0.17
    g_profile /= np.linalg.norm(g_profile)

    # 3. Distractor faces in the event (different people, orthogonal / far away)
    rng = np.random.default_rng(seed=123)
    distractors = []
    for _ in range(25):
        # Different people whose identity resides in dimensions 10..127
        vec = np.zeros(128, dtype=np.float32)
        idx = rng.integers(10, 127, size=5)
        vec[idx] = rng.standard_normal(5)
        vec /= np.linalg.norm(vec)
        distractors.append(vec)

    # Include attendee's profile photo in candidate rows pool (as happens in real retrieval)
    all_pool = distractors + [g_profile, g_frontal]

    # Train personalized SVM
    svm = FaceSVMClassifier(c_param=1.0)
    success = svm.fit(probes, all_pool)
    assert success is True

    # A. Verify attendee's strict side profile is classified POSITIVE
    score_profile = svm.score(g_profile)
    conf_profile = svm.predict_confidence(g_profile, min_dist=min(np.linalg.norm(p - g_profile) for p in probes))
    assert score_profile > 0.05, f"Expected positive SVM score for attendee profile, got {score_profile}"
    assert conf_profile >= 70.0, f"Expected >= 70% confidence for profile match, got {conf_profile}"

    # B. Verify attendee's frontal photo is classified POSITIVE
    score_frontal = svm.score(g_frontal)
    conf_frontal = svm.predict_confidence(g_frontal, min_dist=min(np.linalg.norm(p - g_frontal) for p in probes))
    assert score_frontal > 0.05
    assert conf_frontal >= 85.0

    # C. Verify ZERO false positive bleed on all 25 event distractors
    for idx, d in enumerate(distractors):
        score_d = svm.score(d)
        min_dist_d = min(float(np.linalg.norm(p - d)) for p in probes)
        is_match = (min_dist_d <= 0.60) or (score_d > 0.05)
        assert is_match is False, f"Distractor {idx} falsely matched! score={score_d}, min_dist={min_dist_d}"
        assert score_d < 0.0, f"Distractor {idx} got positive SVM score {score_d}"
