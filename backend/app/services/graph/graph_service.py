from typing import Any, Dict, List, Optional
from backend.app.core.logging import logger
from backend.app.models.schemas import (
    EdgeType,
    GraphDataResponse,
    GraphEdge,
    GraphNode,
    NodeType,
)
from backend.app.services.graph.memory_graph import memory_graph
from backend.app.services.graph.neo4j_driver import neo4j_manager


class GraphService:
    """Unified Graph Service with Neo4j driver & memory graph acceleration."""

    def __init__(self):
        self.memory = memory_graph
        self.neo4j = neo4j_manager

    async def clear_graph(self):
        self.memory.clear()
        if self.neo4j.is_connected:
            try:
                await self.neo4j.execute_query("MATCH (n) DETACH DELETE n")
                logger.info("Cleared Neo4j graph database.")
            except Exception as e:
                logger.error(f"Error clearing Neo4j database: {e}")

    async def add_node(self, node: GraphNode) -> GraphNode:
        saved = self.memory.add_node(node)
        if self.neo4j.is_connected:
            query = f"""
            MERGE (n:{node.type.value} {{id: $id}})
            SET n.name = $name,
                n.label = $label,
                n.file_path = $file_path,
                n.language = $language,
                n.complexity = $complexity,
                n.risk_score = $risk_score
            RETURN n
            """
            try:
                await self.neo4j.execute_query(
                    query,
                    {
                        "id": node.id,
                        "name": node.name,
                        "label": node.label,
                        "file_path": node.file_path,
                        "language": node.language,
                        "complexity": node.complexity,
                        "risk_score": node.risk_score,
                    },
                )
            except Exception as e:
                logger.debug(f"Neo4j node sync note: {e}")
        return saved

    async def add_edge(self, edge: GraphEdge) -> Optional[GraphEdge]:
        saved = self.memory.add_edge(edge)
        if not saved:
            return None

        if self.neo4j.is_connected:
            rel_type = edge.type.value
            query = f"""
            MATCH (a {{id: $source}}), (b {{id: $target}})
            MERGE (a)-[r:{rel_type} {{id: $id}}]->(b)
            SET r.weight = $weight
            RETURN r
            """
            try:
                await self.neo4j.execute_query(
                    query,
                    {
                        "source": edge.source,
                        "target": edge.target,
                        "id": edge.id,
                        "weight": edge.weight,
                    },
                )
            except Exception as e:
                logger.debug(f"Neo4j edge sync note: {e}")
        return saved

    async def get_graph(self) -> GraphDataResponse:
        return self.memory.to_graph_data()

    async def get_node(self, node_id: str) -> Optional[GraphNode]:
        return self.memory.find_node_by_identifier(node_id)


graph_service = GraphService()
