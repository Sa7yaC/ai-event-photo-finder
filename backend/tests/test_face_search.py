"""
Stage 3 tests: Face indexing and selfie search.

The `face_recognition` native library (dlib) may not be installed in the test environment.
All tests use a mock FaceRecognitionService to avoid that dependency while still fully
exercising FaceService, the selfie search endpoint, and the database layer.
"""
import io
import uuid
from typing import List
from unittest.mock import MagicMock, patch

import numpy as np
import pytest
from httpx import AsyncClient
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.base import FaceRecognitionService
from app.ai import get_face_recognition_service
from app.main import app
from app.services.face_service import FaceService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def generate_test_image(color="blue", format="JPEG", size=(200, 200)) -> bytes:
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()


def make_random_embedding(seed: int = 0) -> np.ndarray:
    """Generate a deterministic random 128-d unit-normalised embedding."""
    rng = np.random.RandomState(seed)
    v = rng.randn(128).astype(np.float32)
    return v / np.linalg.norm(v)


class MockFaceRecognitionService(FaceRecognitionService):
    """
    Test double for FaceRecognitionService.
    Behaviour is controlled per-test via `embeddings_to_return`.
    """

    def __init__(self, embeddings: List[np.ndarray] | None = None):
        # Default: return one face embedding per call
        self._embeddings = embeddings if embeddings is not None else [make_random_embedding(42)]

    def extract_embeddings(self, image_bytes: bytes) -> List[np.ndarray]:
        return list(self._embeddings)

    def compare(self, probe, candidates, tolerance=0.6):
        results = []
        for c in candidates:
            dist = float(np.linalg.norm(probe - np.array(c)))
            results.append(dist <= tolerance)
        return results


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_face_svc_one_face():
    """Mock that always detects exactly one face."""
    return MockFaceRecognitionService([make_random_embedding(42)])


@pytest.fixture
def mock_face_svc_no_faces():
    """Mock that detects no faces (e.g., landscape photo)."""
    return MockFaceRecognitionService([])


# ---------------------------------------------------------------------------
# Unit tests: FaceService
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_face_indexing_stores_embeddings(async_client: AsyncClient):
    """
    After uploading a photo with a face, one FaceEmbedding row should be persisted.
    We verify via the event stats endpoint (detected_faces count).
    """
    # 1. Create event
    res = await async_client.post("/api/v1/events", json={"name": "Face Index Test"})
    assert res.status_code == 201
    event_data = res.json()
    event_id = event_data["id"]
    token = event_data["organizer_token"]

    # 2. Override the face service to return 1 embedding
    face_svc = MockFaceRecognitionService([make_random_embedding(1)])
    app.dependency_overrides[get_face_recognition_service] = lambda: face_svc

    try:
        img = generate_test_image(color="red")
        res = await async_client.post(
            f"/api/v1/events/{event_id}/photos",
            files=[("files", ("person.jpg", img, "image/jpeg"))],
            headers={"X-Organizer-Token": token},
        )
        assert res.status_code == 201
        assert res.json()["total_uploaded"] == 1

        # 3. Check stats — detected_faces should now be 1
        stats = await async_client.get(f"/api/v1/events/{event_id}/stats")
        assert stats.status_code == 200
        stats_data = stats.json()
        assert stats_data["detected_faces"] == 1
        assert stats_data["processed_photos"] == 1
    finally:
        # Restore overrides
        del app.dependency_overrides[get_face_recognition_service]


@pytest.mark.asyncio
async def test_face_indexing_no_faces_marks_completed(async_client: AsyncClient):
    """
    Uploading a photo with no detectable faces should still mark it as 'completed'
    (not 'pending' or 'failed') — face-free photos are valid.
    """
    res = await async_client.post("/api/v1/events", json={"name": "No Face Test"})
    event_id = res.json()["id"]
    token = res.json()["organizer_token"]

    # No faces
    face_svc = MockFaceRecognitionService([])
    app.dependency_overrides[get_face_recognition_service] = lambda: face_svc

    try:
        img = generate_test_image(color="green")
        upload_res = await async_client.post(
            f"/api/v1/events/{event_id}/photos",
            files=[("files", ("landscape.jpg", img, "image/jpeg"))],
            headers={"X-Organizer-Token": token},
        )
        assert upload_res.status_code == 201

        # Stats: 0 detected faces, 1 processed photo
        stats = (await async_client.get(f"/api/v1/events/{event_id}/stats")).json()
        assert stats["detected_faces"] == 0
        assert stats["processed_photos"] == 1

        # Photo record itself should be 'completed'
        photo_id = upload_res.json()["results"][0]["photo_id"]
        photo_res = await async_client.get(f"/api/v1/photos/{photo_id}")
        assert photo_res.json()["processing_status"] == "completed"
    finally:
        del app.dependency_overrides[get_face_recognition_service]


@pytest.mark.asyncio
async def test_selfie_search_finds_matching_photo(async_client: AsyncClient):
    """
    End-to-end selfie search:
    1. Upload a photo that produces embedding A.
    2. Search with a selfie that also produces embedding A (identical → distance 0).
    3. Assert the uploaded photo appears in results.
    """
    embedding_a = make_random_embedding(99)

    # Same embedding for both upload and probe → guaranteed match
    face_svc = MockFaceRecognitionService([embedding_a])
    app.dependency_overrides[get_face_recognition_service] = lambda: face_svc

    try:
        # Create event + upload photo
        res = await async_client.post("/api/v1/events", json={"name": "Search Test Event"})
        event_id = res.json()["id"]
        token = res.json()["organizer_token"]

        img = generate_test_image(color="blue")
        upload_res = await async_client.post(
            f"/api/v1/events/{event_id}/photos",
            files=[("files", ("subject.jpg", img, "image/jpeg"))],
            headers={"X-Organizer-Token": token},
        )
        assert upload_res.status_code == 201
        photo_id = upload_res.json()["results"][0]["photo_id"]

        # Selfie search
        selfie_bytes = generate_test_image(color="purple")
        search_res = await async_client.post(
            f"/api/v1/events/{event_id}/search",
            files=[("selfie", ("selfie.jpg", selfie_bytes, "image/jpeg"))],
        )
        assert search_res.status_code == 200
        data = search_res.json()
        assert data["faces_detected_in_selfie"] == 1
        assert data["total_results"] == 1
        assert data["results"][0]["photo_id"] == photo_id
        assert data["results"][0]["best_distance"] == 0.0  # identical embedding
    finally:
        del app.dependency_overrides[get_face_recognition_service]


@pytest.mark.asyncio
async def test_selfie_search_no_match_returns_empty(async_client: AsyncClient):
    """
    Upload a photo with embedding A, search with an orthogonal embedding B
    (large distance > tolerance) — should return 0 results.
    """
    embedding_a = make_random_embedding(10)
    # Orthogonal embedding (far away in 128-d space)
    embedding_b = make_random_embedding(11)

    # Upload photo uses embedding_a; search uses embedding_b
    class ToggleFaceSvc(FaceRecognitionService):
        def __init__(self):
            self._call_count = 0

        def extract_embeddings(self, image_bytes):
            self._call_count += 1
            # First call = upload indexing; subsequent calls = selfie probe
            if self._call_count == 1:
                return [embedding_a]
            return [embedding_b]

        def compare(self, probe, candidates, tolerance=0.6):
            return [float(np.linalg.norm(probe - np.array(c))) <= tolerance for c in candidates]

    toggle_svc = ToggleFaceSvc()
    app.dependency_overrides[get_face_recognition_service] = lambda: toggle_svc

    try:
        res = await async_client.post("/api/v1/events", json={"name": "No Match Test"})
        event_id = res.json()["id"]
        token = res.json()["organizer_token"]

        img = generate_test_image(color="yellow")
        await async_client.post(
            f"/api/v1/events/{event_id}/photos",
            files=[("files", ("photo.jpg", img, "image/jpeg"))],
            headers={"X-Organizer-Token": token},
        )

        selfie = generate_test_image(color="orange")
        search_res = await async_client.post(
            f"/api/v1/events/{event_id}/search",
            files=[("selfie", ("me.jpg", selfie, "image/jpeg"))],
        )
        assert search_res.status_code == 200
        data = search_res.json()
        assert data["total_results"] == 0
        assert data["results"] == []
    finally:
        del app.dependency_overrides[get_face_recognition_service]


@pytest.mark.asyncio
async def test_selfie_search_no_face_in_selfie(async_client: AsyncClient):
    """
    If the selfie contains no detectable face, the API should return 0 results
    with faces_detected_in_selfie = 0 (not an error).
    """
    face_svc = MockFaceRecognitionService([])  # Always returns no faces
    app.dependency_overrides[get_face_recognition_service] = lambda: face_svc

    try:
        res = await async_client.post("/api/v1/events", json={"name": "Empty Selfie Test"})
        event_id = res.json()["id"]

        selfie = generate_test_image(color="white")
        search_res = await async_client.post(
            f"/api/v1/events/{event_id}/search",
            files=[("selfie", ("blank.jpg", selfie, "image/jpeg"))],
        )
        assert search_res.status_code == 200
        data = search_res.json()
        assert data["faces_detected_in_selfie"] == 0
        assert data["total_results"] == 0
    finally:
        del app.dependency_overrides[get_face_recognition_service]


@pytest.mark.asyncio
async def test_selfie_search_unknown_event_returns_404(async_client: AsyncClient):
    """Searching for a non-existent event should return 404."""
    face_svc = MockFaceRecognitionService([make_random_embedding(0)])
    app.dependency_overrides[get_face_recognition_service] = lambda: face_svc

    try:
        nonexistent_event_id = str(uuid.uuid4())
        selfie = generate_test_image(color="red")
        res = await async_client.post(
            f"/api/v1/events/{nonexistent_event_id}/search",
            files=[("selfie", ("me.jpg", selfie, "image/jpeg"))],
        )
        assert res.status_code == 404
    finally:
        del app.dependency_overrides[get_face_recognition_service]


@pytest.mark.asyncio
async def test_selfie_search_invalid_image_returns_422(async_client: AsyncClient):
    """Uploading a non-image file as selfie should return 422."""
    face_svc = MockFaceRecognitionService([make_random_embedding(0)])
    app.dependency_overrides[get_face_recognition_service] = lambda: face_svc

    try:
        res = await async_client.post("/api/v1/events", json={"name": "Invalid Selfie Test"})
        event_id = res.json()["id"]

        corrupt_bytes = b"This is not an image file."
        search_res = await async_client.post(
            f"/api/v1/events/{event_id}/search",
            files=[("selfie", ("notanimage.jpg", corrupt_bytes, "image/jpeg"))],
        )
        assert search_res.status_code == 422
    finally:
        del app.dependency_overrides[get_face_recognition_service]


@pytest.mark.asyncio
async def test_face_delete_cascades_embeddings(async_client: AsyncClient):
    """
    Deleting a photo should cascade-delete its face embeddings.
    After deletion, event stats should show detected_faces = 0.
    """
    embedding = make_random_embedding(7)
    face_svc = MockFaceRecognitionService([embedding])
    app.dependency_overrides[get_face_recognition_service] = lambda: face_svc

    try:
        res = await async_client.post("/api/v1/events", json={"name": "Cascade Delete Test"})
        event_id = res.json()["id"]
        token = res.json()["organizer_token"]

        img = generate_test_image(color="pink")
        upload_res = await async_client.post(
            f"/api/v1/events/{event_id}/photos",
            files=[("files", ("photo.jpg", img, "image/jpeg"))],
            headers={"X-Organizer-Token": token},
        )
        photo_id = upload_res.json()["results"][0]["photo_id"]

        # Verify face was indexed
        stats_before = (await async_client.get(f"/api/v1/events/{event_id}/stats")).json()
        assert stats_before["detected_faces"] == 1

        # Delete the photo
        del_res = await async_client.delete(
            f"/api/v1/photos/{photo_id}",
            headers={"X-Organizer-Token": token},
        )
        assert del_res.status_code == 204

        # Face embeddings should be cascade-deleted → detected_faces = 0
        stats_after = (await async_client.get(f"/api/v1/events/{event_id}/stats")).json()
        assert stats_after["detected_faces"] == 0
    finally:
        del app.dependency_overrides[get_face_recognition_service]


@pytest.mark.asyncio
async def test_multi_angle_selfie_search(async_client: AsyncClient):
    """
    Test multi-angle selfie matching:
    A gallery photo has an angled profile embedding A.
    The user uploads 3 selfie probes: Front (B), Left Profile (A), Right Profile (C).
    The search must match the photo via the Left Profile probe (distance = 0.0)
    even though the Front probe is far away.
    """
    profile_embedding = make_random_embedding(100)
    front_probe = make_random_embedding(101)  # distance > 0.6
    right_probe = make_random_embedding(102)  # distance > 0.6

    class MultiAngleFaceSvc(FaceRecognitionService):
        def __init__(self):
            self._probe_call = 0

        def extract_embeddings(self, image_bytes, num_jitters=1):
            self._probe_call += 1
            if self._probe_call == 1:
                # Event photo upload
                return [profile_embedding]
            elif self._probe_call == 2:
                # Probe 1: Front
                return [front_probe]
            elif self._probe_call == 3:
                # Probe 2: Left 45 (matches profile photo!)
                return [profile_embedding]
            else:
                # Probe 3: Right 45
                return [right_probe]

        def compare(self, probe, candidates, tolerance=0.6):
            return [float(np.linalg.norm(probe - np.array(c))) <= tolerance for c in candidates]

    app.dependency_overrides[get_face_recognition_service] = lambda: MultiAngleFaceSvc()

    try:
        res = await async_client.post("/api/v1/events", json={"name": "Multi-Angle Test"})
        event_id = res.json()["id"]
        token = res.json()["organizer_token"]

        img = generate_test_image(color="cyan")
        upload_res = await async_client.post(
            f"/api/v1/events/{event_id}/photos",
            files=[("files", ("candid_profile.jpg", img, "image/jpeg"))],
            headers={"X-Organizer-Token": token},
        )
        photo_id = upload_res.json()["results"][0]["photo_id"]

        # Search with 3 selfie files (Front, Left, Right)
        front_img = generate_test_image(color="red")
        left_img = generate_test_image(color="green")
        right_img = generate_test_image(color="blue")

        search_res = await async_client.post(
            f"/api/v1/events/{event_id}/search",
            files=[
                ("files", ("front.jpg", front_img, "image/jpeg")),
                ("files", ("left.jpg", left_img, "image/jpeg")),
                ("files", ("right.jpg", right_img, "image/jpeg")),
            ],
        )
        assert search_res.status_code == 200
        data = search_res.json()
        assert data["faces_detected_in_selfie"] == 3
        assert data["total_results"] == 1
        assert data["results"][0]["photo_id"] == photo_id
        assert data["results"][0]["best_distance"] == 0.0
        assert "svm_score" in data["results"][0]
        assert "confidence" in data["results"][0]
        assert data["results"][0]["confidence"] >= 80.0
    finally:
        del app.dependency_overrides[get_face_recognition_service]
