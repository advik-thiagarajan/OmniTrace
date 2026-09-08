from fastapi import APIRouter
from backend.app.api.v1.repos import router as repos_router
from backend.app.api.v1.analysis import router as analysis_router
from backend.app.api.v1.ai import router as ai_router
from backend.app.api.v1.chat import router as chat_router
from backend.app.api.v1.ws import router as ws_router

api_v1_router = APIRouter()
api_v1_router.include_router(repos_router)
api_v1_router.include_router(analysis_router)
api_v1_router.include_router(ai_router)
api_v1_router.include_router(chat_router)
api_v1_router.include_router(ws_router)

__all__ = ["api_v1_router"]
