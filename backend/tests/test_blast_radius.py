import pytest
from backend.app.models.schemas import BlastRadiusRequest, EdgeType, GraphEdge, GraphNode, NodeType, RiskLevel
from backend.app.services.analysis.blast_radius import BlastRadiusAnalyzer
from backend.app.services.graph.graph_service import GraphService


@pytest.mark.asyncio
async def test_blast_radius_calculation():
    service = GraphService()
    service.memory.clear()

    # Build a dependency chain: fn:core_calc <- fn:process_data <- fn:api_handler <- file:main.py
    n1 = GraphNode(id="fn:core_calc", label="core_calc", name="calc.py::core_calc", type=NodeType.FUNCTION, complexity=4)
    n2 = GraphNode(id="fn:process_data", label="process_data", name="data.py::process_data", type=NodeType.FUNCTION, complexity=2)
    n3 = GraphNode(id="fn:api_handler", label="api_handler", name="api.py::api_handler", type=NodeType.FUNCTION, complexity=5)
    n4 = GraphNode(id="file:main.py", label="main.py", name="main.py", type=NodeType.FILE, complexity=1)

    await service.add_node(n1)
    await service.add_node(n2)
    await service.add_node(n3)
    await service.add_node(n4)

    # CALLS edges: n2 calls n1, n3 calls n2, n4 calls n3
    await service.add_edge(GraphEdge(id="e1", source=n2.id, target=n1.id, type=EdgeType.CALLS))
    await service.add_edge(GraphEdge(id="e2", source=n3.id, target=n2.id, type=EdgeType.CALLS))
    await service.add_edge(GraphEdge(id="e3", source=n4.id, target=n3.id, type=EdgeType.CALLS))

    analyzer = BlastRadiusAnalyzer()
    analyzer.graph = service

    res = await analyzer.analyze_blast_radius(
        BlastRadiusRequest(target_id="fn:core_calc", max_depth=4, change_type="SIGNATURE_CHANGE")
    )

    assert res.target_node.id == "fn:core_calc"
    assert res.total_impacted_nodes == 3  # process_data, api_handler, main.py
    assert res.risk_score > 0
    assert len(res.recommended_mitigation) > 0

    impacted_node_ids = [n.node.id for n in res.impacted_nodes]
    assert "fn:process_data" in impacted_node_ids
    assert "fn:api_handler" in impacted_node_ids
    assert "file:main.py" in impacted_node_ids
