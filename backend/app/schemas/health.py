from datetime import datetime, timezone
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(..., description="Overall service status (healthy/degraded)")
    app_name: str = Field(..., description="Application name")
    version: str = Field(..., description="Current application version")
    database_connected: bool = Field(..., description="Database connectivity status")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="UTC timestamp of the check")
