import pytest
from backend.app.models.schemas import EdgeType, GraphEdge, GraphNode, NodeType
from backend.app.services.graph.memory_graph import MemoryGraph


def test_memory_graph_operations():
    g = MemoryGraph()

    n1 = GraphNode(id="file:auth.py", label="auth.py", name="auth.py", type=NodeType.FILE)
    n2 = GraphNode(id="fn:auth.py::login", label="login", name="auth.py::login", type=NodeType.FUNCTION, complexity=3)
    n3 = GraphNode(id="fn:auth.py::verify_token", label="verify_token", name="auth.py::verify_token", type=NodeType.FUNCTION, complexity=2)

    g.add_node(n1)
    g.add_node(n2)
    g.add_node(n3)

    assert len(g.nodes) == 3

    # Add edges
    # File contains functions
    g.add_edge(GraphEdge(id="e1", source=n1.id, target=n2.id, type=EdgeType.CONTAINS))
    g.add_edge(GraphEdge(id="e2", source=n1.id, target=n3.id, type=EdgeType.CONTAINS))
    # login calls verify_token
    g.add_edge(GraphEdge(id="e3", source=n2.id, target=n3.id, type=EdgeType.CALLS))

    assert len(g.edges) == 3
    assert g.nodes[n2.id].fan_out == 1
    assert g.nodes[n3.id].fan_in == 2  # CONTAINS from file + CALLS from login

    # Test downstream traversal (who is impacted if verify_token changes)
    impacted = g.traverse_downstream(n3.id, max_depth=3)
    impacted_ids = [item["node"].id for item in impacted]

    # Both login and auth.py point to verify_token
    assert n2.id in impacted_ids
    assert n1.id in impacted_ids

    # Test 3D layout computation
    g.compute_3d_layout()
    for node in g.nodes.values():
        assert node.position is not None
        assert len(node.position) == 3
