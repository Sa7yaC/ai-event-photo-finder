"""
AI layer — face recognition provider factory and public exports.
"""
from app.ai.base import FaceRecognitionService
from app.ai.face_recognition_service import DlibFaceRecognitionService
from app.ai.svm_classifier import FaceSVMClassifier

# Singleton instance — Dlib ResNet-34 face recognition service
_face_recognition_instance: FaceRecognitionService | None = None


def get_face_recognition_service() -> FaceRecognitionService:
    """
    FastAPI / application dependency that returns the singleton face recognition service.
    Uses high-accuracy Dlib ResNet-34 metric embedding.
    """
    global _face_recognition_instance
    if _face_recognition_instance is None:
        _face_recognition_instance = DlibFaceRecognitionService()
    return _face_recognition_instance


__all__ = [
    "FaceRecognitionService",
    "DlibFaceRecognitionService",
    "FaceSVMClassifier",
    "get_face_recognition_service",
]
