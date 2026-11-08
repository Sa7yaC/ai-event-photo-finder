from fastapi import APIRouter
from app.core.config import settings
from app.core.database import check_database_connection
from app.schemas.health import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, summary="Service health check")
async def get_health() -> HealthResponse:
    """
    Check the health of the application and its database connection.
    Does not expose sensitive credentials, paths, or connection strings.
    """
    db_connected = await check_database_connection()
    status = "healthy" if db_connected else "degraded"
    
    return HealthResponse(
        status=status,
        app_name=settings.PROJECT_NAME,
        version=settings.VERSION,
        database_connected=db_connected,
    )
