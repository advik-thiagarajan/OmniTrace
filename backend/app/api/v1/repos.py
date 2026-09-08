import asyncio
import os
from typing import Any, Dict
from fastapi import APIRouter, HTTPException, Query
from backend.app.core.logging import logger
from backend.app.models.schemas import (
    GraphDataResponse,
    RepoIngestRequest,
    RepoIngestResponse,
    RepoSummary,
    WebSocketEventType,
)
from backend.app.services.graph.graph_service import graph_service
from backend.app.services.ingest.repo_scanner import repo_scanner
from backend.app.services.realtime.file_watcher import file_watcher_service
from backend.app.services.realtime.websocket_manager import ws_manager

router = APIRouter(prefix="/repos", tags=["Repositories"])


@router.post("/analyze", response_model=RepoIngestResponse)
async def analyze_repository(request: RepoIngestRequest):
    """Scans and analyzes a local repository, extracting AST symbols and building graph lineage."""
    try:
        if not os.path.exists(request.repo_path):
            # If path doesn't exist, try resolving relative to current workspace or current dir
            alt_path = os.path.abspath(request.repo_path)
            if not os.path.exists(alt_path):
                raise HTTPException(status_code=400, detail=f"Directory path '{request.repo_path}' does not exist.")
            request.repo_path = alt_path

        response = await repo_scanner.scan_and_ingest(request)

        # Start background file watcher
        loop = asyncio.get_event_loop()
        file_watcher_service.start_watching(request.repo_path, loop)

        # Broadcast graph update event over WebSockets
        await ws_manager.broadcast_event(
            WebSocketEventType.GRAPH_UPDATED,
            {
                "repo_name": response.repo_name,
                "total_nodes": response.files_scanned + response.functions_extracted + response.classes_extracted,
                "total_edges": response.edges_created,
            },
        )

        return response
    except Exception as e:
        logger.error(f"Error analyzing repo: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph", response_model=GraphDataResponse)
async def get_graph_data():
    """Retrieves full 3D node and edge constellation data for visualization."""
    return await graph_service.get_graph()


@router.get("/stats", response_model=RepoSummary)
async def get_repo_stats():
    """Retrieves summary metrics, language distribution, and average complexity."""
    g = graph_service.memory
    nodes = list(g.nodes.values())
    files = [n for n in nodes if n.type.value == "FILE"]
    funcs = [n for n in nodes if n.type.value == "FUNCTION"]
    classes = [n for n in nodes if n.type.value == "CLASS"]

    lang_dist: Dict[str, int] = {}
    for f in files:
        lang = f.language or "unknown"
        lang_dist[lang] = lang_dist.get(lang, 0) + 1

    total_complexity = sum(n.complexity or 1 for n in funcs)
    avg_comp = round(total_complexity / max(1, len(funcs)), 2)

    return RepoSummary(
        name=g.repo_name,
        path=os.getcwd(),
        total_files=len(files),
        total_functions=len(funcs),
        total_classes=len(classes),
        total_dependencies=len(g.edges),
        languages=lang_dist,
        avg_complexity=avg_comp,
    )


@router.post("/simulate-mutation")
async def simulate_code_mutation(node_id: str = Query(..., description="Target node ID to simulate mutation on")):
    """Simulates a code change/mutation event to demonstrate live 3D visual updates and WebSocket broadcasting."""
    node = await graph_service.get_node(node_id)
    if not node:
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found.")

    await ws_manager.broadcast_event(
        WebSocketEventType.SIMULATION_EVENT,
        {
            "node_id": node.id,
            "node_label": node.label,
            "file_path": node.file_path,
            "mutation_type": "SIGNATURE_UPDATE",
            "message": f"Simulated live mutation in {node.label}",
        },
    )
    return {"status": "SUCCESS", "message": f"Broadcasted live mutation simulation on {node.label}"}
