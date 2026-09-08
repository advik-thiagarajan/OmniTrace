from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException
from backend.app.core.logging import logger
from backend.app.models.schemas import BlastRadiusRequest, BlastRadiusResponse
from backend.app.services.analysis.blast_radius import blast_radius_analyzer
from backend.app.services.graph.graph_service import graph_service

router = APIRouter(prefix="/analysis", tags=["Analysis & Blast Radius"])


@router.post("/blast-radius", response_model=BlastRadiusResponse)
async def calculate_blast_radius(request: BlastRadiusRequest):
    """Calculates downstream predictive blast radius and risk scoring for code changes."""
    try:
        response = await blast_radius_analyzer.analyze_blast_radius(request)
        return response
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error calculating blast radius: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/impact-matrix")
async def get_high_risk_components():
    """Identifies top high-risk hubs with the highest fan-in degree in the repository."""
    g = graph_service.memory
    nodes = list(g.nodes.values())
    
    # Calculate impact profile for all non-repository nodes
    ranked = []
    for node in nodes:
        fan_in = len(g.in_edges.get(node.id, []))
        fan_out = len(g.out_edges.get(node.id, []))
        if fan_in > 0 or fan_out > 0:
            risk_estimate = min(100.0, round((fan_in * 12.0) + (node.complexity or 1) * 3.5, 1))
            ranked.append({
                "node_id": node.id,
                "label": node.label,
                "type": node.type.value,
                "file_path": node.file_path,
                "fan_in": fan_in,
                "fan_out": fan_out,
                "complexity": node.complexity,
                "estimated_risk": risk_estimate,
            })

    ranked.sort(key=lambda x: x["estimated_risk"], reverse=True)
    return {"top_risk_hubs": ranked[:10], "total_evaluated": len(ranked)}
