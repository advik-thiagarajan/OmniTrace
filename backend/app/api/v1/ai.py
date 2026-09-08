from fastapi import APIRouter, HTTPException
from backend.app.core.logging import logger
from backend.app.models.schemas import (
    DiffSummaryRequest,
    DiffSummaryResponse,
    NodeExplanationRequest,
    NodeExplanationResponse,
)
from backend.app.services.ai.ollama_client import ollama_client
from backend.app.services.ai.semantic_summarizer import semantic_summarizer
from backend.app.services.graph.graph_service import graph_service

router = APIRouter(prefix="/ai", tags=["Local AI & Summaries"])


@router.get("/status")
async def get_ai_status():
    """Checks local Ollama service health and active model availability."""
    is_healthy = await ollama_client.check_health()
    return {
        "ollama_available": is_healthy,
        "base_url": ollama_client.base_url,
        "model": ollama_client.model,
        "mode": "Ollama LLM" if is_healthy else "Intelligent Heuristic Fallback",
    }


@router.post("/summarize-diff", response_model=DiffSummaryResponse)
async def summarize_code_diff(request: DiffSummaryRequest):
    """Generates an AI semantic narrative and breaking change analysis for a code diff."""
    try:
        return await semantic_summarizer.summarize_diff(request)
    except Exception as e:
        logger.error(f"Error summarizing diff: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/explain-node", response_model=NodeExplanationResponse)
async def explain_node(request: NodeExplanationRequest):
    """Generates an architectural summary for a specific node in the knowledge graph."""
    node = await graph_service.get_node(request.node_id)
    if not node:
        raise HTTPException(status_code=404, detail=f"Node '{request.node_id}' not found.")

    neighbors = graph_service.memory.get_neighbors(node.id, direction="both")
    upstream = [src.label for src, e in neighbors if e.target == node.id]
    downstream = [tgt.label for tgt, e in neighbors if e.source == node.id]

    prompt = (
        f"Explain the architectural role of {node.type.value} '{node.label}' located in '{node.file_path}'. "
        f"It is called/imported by {upstream} and calls {downstream}. "
        f"Complexity: {node.complexity}. Keep it concise in 2 paragraphs."
    )

    ai_res = await ollama_client.generate_completion(prompt)

    return NodeExplanationResponse(
        node_id=node.id,
        title=f"Architectural Profile: {node.label}",
        explanation=ai_res.get("text", ""),
        semantic_role=f"{node.type.value} in {node.file_path or 'root'}",
        upstream_dependencies=upstream,
        downstream_dependents=downstream,
    )
