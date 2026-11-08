import io
import pytest
from httpx import AsyncClient
from PIL import Image


def generate_test_image(color="blue", format="JPEG", size=(200, 200)) -> bytes:
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()


@pytest.mark.asyncio
async def test_photo_upload_authorized(async_client: AsyncClient):
    # 1. Create an event
    create_res = await async_client.post(
        "/api/v1/events",
        json={"name": "Photo Test Event"},
    )
    event_data = create_res.json()
    event_id = event_data["id"]
    organizer_token = event_data["organizer_token"]

    # 2. Upload valid image
    img_bytes = generate_test_image(color="red", format="JPEG")
    files = [
        ("files", ("test1.jpg", img_bytes, "image/jpeg")),
    ]
    headers = {"X-Organizer-Token": organizer_token}

    upload_res = await async_client.post(
        f"/api/v1/events/{event_id}/photos",
        files=files,
        headers=headers,
    )
    assert upload_res.status_code == 201
    upload_data = upload_res.json()
    assert upload_data["total_received"] == 1
    assert upload_data["total_uploaded"] == 1
    assert upload_data["total_duplicates"] == 0
    assert upload_data["total_failed"] == 0
    assert upload_data["results"][0]["status"] == "uploaded"
    photo_id = upload_data["results"][0]["photo_id"]
    assert photo_id is not None

    # 3. Check event stats reflect total_photos = 1.
    # Stage 3: Photos are now immediately marked 'completed' after face indexing runs
    # (even when face_recognition is not installed — FaceService still completes them).
    stats_res = await async_client.get(f"/api/v1/events/{event_id}/stats")
    stats = stats_res.json()
    assert stats["total_photos"] == 1
    # Photo transitions to completed after face indexing — pending_photos may be 0 or 1
    # depending on whether face_recognition is installed in the test environment
    assert stats["processed_photos"] + stats["pending_photos"] == 1

    # 4. Check photo list endpoint
    list_res = await async_client.get(
        f"/api/v1/events/{event_id}/photos",
        headers=headers,
    )
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] == 1
    assert list_data["items"][0]["id"] == photo_id
    assert list_data["items"][0]["image_width"] == 200
    assert list_data["items"][0]["image_height"] == 200

    # 5. Check download endpoint
    download_res = await async_client.get(f"/api/v1/photos/{photo_id}/download")
    assert download_res.status_code == 200
    assert len(download_res.content) == len(img_bytes)

    # 6. Delete photo
    delete_res = await async_client.delete(
        f"/api/v1/photos/{photo_id}",
        headers=headers,
    )
    assert delete_res.status_code == 204

    # Confirm deletion
    get_res = await async_client.get(f"/api/v1/photos/{photo_id}")
    assert get_res.status_code == 404


@pytest.mark.asyncio
async def test_photo_upload_unauthorized(async_client: AsyncClient):
    create_res = await async_client.post(
        "/api/v1/events",
        json={"name": "Auth Test Event"},
    )
    event_id = create_res.json()["id"]

    img_bytes = generate_test_image(color="green")
    files = [("files", ("test.jpg", img_bytes, "image/jpeg"))]

    # No token provided
    res_no_token = await async_client.post(f"/api/v1/events/{event_id}/photos", files=files)
    assert res_no_token.status_code == 403

    # Wrong token provided
    res_wrong_token = await async_client.post(
        f"/api/v1/events/{event_id}/photos",
        files=files,
        headers={"X-Organizer-Token": "invalid_token_123"},
    )
    assert res_wrong_token.status_code == 403


@pytest.mark.asyncio
async def test_photo_duplicate_detection(async_client: AsyncClient):
    create_res = await async_client.post(
        "/api/v1/events",
        json={"name": "Duplicate Test Event"},
    )
    event_data = create_res.json()
    event_id = event_data["id"]
    organizer_token = event_data["organizer_token"]
    headers = {"X-Organizer-Token": organizer_token}

    img_bytes = generate_test_image(color="yellow")

    # Upload first time
    res1 = await async_client.post(
        f"/api/v1/events/{event_id}/photos",
        files=[("files", ("image1.jpg", img_bytes, "image/jpeg"))],
        headers=headers,
    )
    assert res1.status_code == 201
    assert res1.json()["total_uploaded"] == 1

    # Upload identical content second time
    res2 = await async_client.post(
        f"/api/v1/events/{event_id}/photos",
        files=[("files", ("image1_copy.jpg", img_bytes, "image/jpeg"))],
        headers=headers,
    )
    assert res2.status_code == 201
    data2 = res2.json()
    assert data2["total_uploaded"] == 0
    assert data2["total_duplicates"] == 1
    assert data2["results"][0]["status"] == "duplicate"


@pytest.mark.asyncio
async def test_photo_invalid_and_corrupt_files(async_client: AsyncClient):
    create_res = await async_client.post(
        "/api/v1/events",
        json={"name": "Invalid File Test"},
    )
    event_data = create_res.json()
    event_id = event_data["id"]
    headers = {"X-Organizer-Token": event_data["organizer_token"]}

    # Text file disguised as jpg
    corrupt_bytes = b"This is just a plain text file, not an image!"
    res = await async_client.post(
        f"/api/v1/events/{event_id}/photos",
        files=[("files", ("fake.jpg", corrupt_bytes, "image/jpeg"))],
        headers=headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["total_failed"] == 1
    assert data["results"][0]["status"] == "failed"
    assert "not a valid" in data["results"][0]["message"].lower()
