from fastapi import APIRouter
from app.api.v1.events import router as events_router
from app.api.v1.health import router as health_router
from app.api.v1.photos import router as photos_router
from app.api.v1.search import router as search_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(events_router, prefix="/events", tags=["events"])
api_router.include_router(photos_router, prefix="/photos", tags=["photos"])
api_router.include_router(search_router, prefix="/events", tags=["search"])

