import math
import random
from typing import Any, Dict, List, Optional, Set, Tuple
from backend.app.models.schemas import (
    EdgeType,
    GraphDataResponse,
    GraphEdge,
    GraphNode,
    NodeType,
)
from backend.app.core.logging import logger


class MemoryGraph:
    """Enterprise In-Memory Graph Database Engine.
    
    Provides bidirectional adjacency indices, topological traversal,
    3D spatial coordinate positioning, and fan-in/fan-out graph metrics.
    """

    def __init__(self):
        self.nodes: Dict[str, GraphNode] = {}
        self.edges: Dict[str, GraphEdge] = {}
        # Adjacency maps
        self.out_edges: Dict[str, List[str]] = {}  # node_id -> list of edge_ids
        self.in_edges: Dict[str, List[str]] = {}   # node_id -> list of edge_ids
        self.repo_name: str = "OmniTrace-Workspace"

    def clear(self):
        self.nodes.clear()
        self.edges.clear()
        self.out_edges.clear()
        self.in_edges.clear()

    def add_node(self, node: GraphNode) -> GraphNode:
        if node.id not in self.nodes:
            self.nodes[node.id] = node
            self.out_edges[node.id] = []
            self.in_edges[node.id] = []
        else:
            # Update properties
            existing = self.nodes[node.id]
            existing.properties.update(node.properties)
            if node.complexity:
                existing.complexity = node.complexity
            if node.risk_score:
                existing.risk_score = node.risk_score
        return self.nodes[node.id]

    def add_edge(self, edge: GraphEdge) -> Optional[GraphEdge]:
        if edge.source not in self.nodes or edge.target not in self.nodes:
            return None

        if edge.id in self.edges:
            return self.edges[edge.id]

        self.edges[edge.id] = edge
        self.out_edges.setdefault(edge.source, []).append(edge.id)
        self.in_edges.setdefault(edge.target, []).append(edge.id)

        # Update node degree metrics
        self.nodes[edge.source].fan_out = len(self.out_edges[edge.source])
        self.nodes[edge.target].fan_in = len(self.in_edges[edge.target])

        return edge

    def get_node(self, node_id: str) -> Optional[GraphNode]:
        return self.nodes.get(node_id)

    def find_node_by_identifier(self, identifier: str) -> Optional[GraphNode]:
        """Matches by ID, exact name, relative file path, or qualified name."""
        if identifier in self.nodes:
            return self.nodes[identifier]
        for node in self.nodes.values():
            if node.name == identifier:
                return node
            if node.file_path and (node.file_path == identifier or node.file_path.endswith(identifier)):
                return node
            if node.id.endswith(f"::{identifier}"):
                return node
        return None

    def get_neighbors(
        self, node_id: str, direction: str = "both"
    ) -> List[Tuple[GraphNode, GraphEdge]]:
        results = []
        if direction in ("out", "both"):
            for e_id in self.out_edges.get(node_id, []):
                edge = self.edges[e_id]
                target_node = self.nodes.get(edge.target)
                if target_node:
                    results.append((target_node, edge))

        if direction in ("in", "both"):
            for e_id in self.in_edges.get(node_id, []):
                edge = self.edges[e_id]
                source_node = self.nodes.get(edge.source)
                if source_node:
                    results.append((source_node, edge))

        return results

    def traverse_downstream(
        self, start_node_id: str, max_depth: int = 4
    ) -> List[Dict[str, Any]]:
        """Finds all components impacted downstream if start_node_id is changed.
        
        Follows incoming CALLS, IMPORTS, DEPENDS_ON edges (i.e. who depends on this node).
        """
        if start_node_id not in self.nodes:
            return []

        visited: Set[str] = {start_node_id}
        queue: List[Tuple[str, int, List[str], List[str]]] = [
            (start_node_id, 0, [start_node_id], [])
        ]
        impacted: List[Dict[str, Any]] = []

        while queue:
            curr_id, depth, path, rel_path = queue.pop(0)
            if depth >= max_depth:
                continue

            # Look for nodes that call/import curr_id (incoming edges)
            for edge_id in self.in_edges.get(curr_id, []):
                edge = self.edges[edge_id]
                upstream_id = edge.source
                if upstream_id not in visited and upstream_id in self.nodes:
                    visited.add(upstream_id)
                    new_path = path + [upstream_id]
                    new_rels = rel_path + [edge.type.value]
                    dep_node = self.nodes[upstream_id]

                    impacted.append({
                        "node": dep_node,
                        "depth": depth + 1,
                        "path": new_path,
                        "relationships": new_rels,
                        "edge": edge,
                    })
                    queue.append((upstream_id, depth + 1, new_path, new_rels))

        return impacted

    def compute_3d_layout(self):
        """Generates spherical constellation 3D coordinates for all nodes."""
        node_list = list(self.nodes.values())
        total = len(node_list)
        if total == 0:
            return

        # Cluster by module/directory
        clusters: Dict[str, List[GraphNode]] = {}
        for n in node_list:
            dir_key = "root"
            if n.file_path:
                parts = n.file_path.replace("\\", "/").split("/")
                dir_key = parts[0] if len(parts) > 1 else "root"
            clusters.setdefault(dir_key, []).append(n)

        cluster_keys = list(clusters.keys())
        num_clusters = len(cluster_keys)

        for c_idx, key in enumerate(cluster_keys):
            c_nodes = clusters[key]
            # Cluster center on a circle or sphere
            angle = (2 * math.pi * c_idx) / max(num_clusters, 1)
            cluster_radius = 45.0 + (num_clusters * 4.0)
            cx = cluster_radius * math.cos(angle)
            cz = cluster_radius * math.sin(angle)
            cy = (c_idx % 3 - 1) * 15.0

            n_count = len(c_nodes)
            phi_inc = math.pi * (3.0 - math.sqrt(5.0))  # golden angle

            for i, node in enumerate(c_nodes):
                # Fibonacci sphere distribution within cluster
                y_norm = 1.0 - (i / float(max(n_count - 1, 1))) * 2.0
                rad_at_y = math.sqrt(max(0.0, 1.0 - y_norm * y_norm))
                theta = phi_inc * i

                local_radius = 12.0 + math.sqrt(n_count) * 3.5
                nx = cx + local_radius * rad_at_y * math.cos(theta)
                ny = cy + local_radius * y_norm
                nz = cz + local_radius * rad_at_y * math.sin(theta)

                node.position = [round(nx, 2), round(ny, 2), round(nz, 2)]

    def to_graph_data(self) -> GraphDataResponse:
        self.compute_3d_layout()
        return GraphDataResponse(
            repo_name=self.repo_name,
            nodes=list(self.nodes.values()),
            edges=list(self.edges.values()),
            total_nodes=len(self.nodes),
            total_edges=len(self.edges),
        )


memory_graph = MemoryGraph()
