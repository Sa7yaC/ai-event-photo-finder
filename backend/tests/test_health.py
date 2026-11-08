import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_root_endpoint(async_client: AsyncClient):
    response = await async_client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "name" in data
    assert "version" in data
    assert "docs" in data
    assert "health" in data


@pytest.mark.asyncio
async def test_health_endpoint_structure(async_client: AsyncClient):
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    
    # Assert expected schema fields
    assert "status" in data
    assert data["status"] in ["healthy", "degraded"]
    assert "app_name" in data
    assert "version" in data
    assert "database_connected" in data
    assert isinstance(data["database_connected"], bool)
    assert "timestamp" in data

    # Security check: Ensure no secrets, internal paths or credentials leaked
    body_text = response.text.lower()
    assert "password" not in body_text
    assert "secret" not in body_text
    assert "traceback" not in body_text
