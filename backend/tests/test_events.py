import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_event_success(async_client: AsyncClient):
    payload = {
        "name": "College Fest 2026",
        "description": "Annual engineering college cultural fest",
        "event_date": "2026-11-15",
    }
    response = await async_client.post("/api/v1/events", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "College Fest 2026"
    assert "slug" in data
    assert data["slug"].startswith("college-fest-2026-")
    assert "organizer_token" in data
    assert len(data["organizer_token"]) >= 32
    assert "id" in data


@pytest.mark.asyncio
async def test_create_event_validation_failure(async_client: AsyncClient):
    # Empty name should fail validation
    payload = {"name": "   "}
    response = await async_client.post("/api/v1/events", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_event_by_id_and_slug(async_client: AsyncClient):
    # 1. Create event
    create_res = await async_client.post(
        "/api/v1/events",
        json={"name": "Alumni Meet 2026"},
    )
    assert create_res.status_code == 201
    created_data = create_res.json()
    event_id = created_data["id"]
    slug = created_data["slug"]

    # 2. Get by ID
    get_id_res = await async_client.get(f"/api/v1/events/{event_id}")
    assert get_id_res.status_code == 200
    assert get_id_res.json()["id"] == event_id
    assert "organizer_token" not in get_id_res.json()  # Never expose organizer token on public retrieval

    # 3. Get by slug
    get_slug_res = await async_client.get(f"/api/v1/events/by-slug/{slug}")
    assert get_slug_res.status_code == 200
    assert get_slug_res.json()["slug"] == slug


@pytest.mark.asyncio
async def test_event_stats(async_client: AsyncClient):
    create_res = await async_client.post(
        "/api/v1/events",
        json={"name": "Hackathon 2026"},
    )
    event_id = create_res.json()["id"]

    stats_res = await async_client.get(f"/api/v1/events/{event_id}/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_photos"] == 0
    assert stats["pending_photos"] == 0
    assert stats["processed_photos"] == 0
    assert stats["failed_photos"] == 0
