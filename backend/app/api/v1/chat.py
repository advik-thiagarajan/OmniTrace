from fastapi import APIRouter, HTTPException
from backend.app.core.logging import logger
from backend.app.models.schemas import ArchaeologistChatRequest, ArchaeologistChatResponse
from backend.app.services.ai.code_archaeologist import code_archaeologist

router = APIRouter(prefix="/chat", tags=["Code Archaeologist"])


@router.post("/archaeologist", response_model=ArchaeologistChatResponse)
async def query_code_archaeologist(request: ArchaeologistChatRequest):
    """Natural language conversational interface (GraphRAG) for querying repository architecture."""
    try:
        return await code_archaeologist.answer_query(request)
    except Exception as e:
        logger.error(f"Error querying code archaeologist: {e}")
        raise HTTPException(status_code=500, detail=str(e))
