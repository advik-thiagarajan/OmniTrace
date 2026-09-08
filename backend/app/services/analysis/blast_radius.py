import math
from typing import List, Optional
from backend.app.core.logging import logger
from backend.app.models.schemas import (
    BlastRadiusRequest,
    BlastRadiusResponse,
    GraphEdge,
    GraphNode,
    ImpactedNode,
    RiskBreakdown,
    RiskLevel,
)
from backend.app.services.graph.graph_service import graph_service


class BlastRadiusAnalyzer:
    """Calculates downstream predictive blast radius, cascading dependencies, and risk scores."""

    def __init__(self):
        self.graph = graph_service

    async def analyze_blast_radius(self, request: BlastRadiusRequest) -> BlastRadiusResponse:
        target_node = await self.graph.get_node(request.target_id)
        if not target_node:
            raise ValueError(f"Target node '{request.target_id}' not found in knowledge graph.")

        # Traverse downstream dependents
        raw_impacted = self.graph.memory.traverse_downstream(
            target_node.id, max_depth=request.max_depth
        )

        impacted_nodes: List[ImpactedNode] = []
        impacted_edges: List[GraphEdge] = []
        seen_edges = set()

        total_complexity = target_node.complexity or 1
        critical_count = 0

        for item in raw_impacted:
            node: GraphNode = item["node"]
            depth: int = item["depth"]
            path: List[str] = item["path"]
            rels: List[str] = item["relationships"]
            edge: GraphEdge = item["edge"]

            if edge.id not in seen_edges:
                seen_edges.add(edge.id)
                impacted_edges.append(edge)

            # Node criticality
            is_critical = self._is_critical_node(node)
            if is_critical:
                critical_count += 1

            complexity = node.complexity or 1
            total_complexity += complexity

            # Individual risk calculation
            decay = math.pow(0.85, depth - 1)
            ind_risk = min(100.0, (25.0 * decay) + (complexity * 2.5) + (20.0 if is_critical else 0.0))

            reason = f"Direct dependent via {rels[-1]}" if depth == 1 else f"Transitive dependent at depth {depth} via {rels[-1]}"

            impacted_nodes.append(
                ImpactedNode(
                    node=node,
                    depth=depth,
                    path_from_target=path,
                    relationship_types=rels,
                    individual_risk=round(ind_risk, 1),
                    reason=reason,
                )
            )

        # Calculate composite risk score (0 - 100)
        fan_out_count = len([n for n in impacted_nodes if n.depth == 1])
        fan_out_score = min(35.0, fan_out_count * 7.0)

        depth_penalty = min(25.0, len(impacted_nodes) * 3.0)
        complexity_factor = min(20.0, (total_complexity / max(1, len(impacted_nodes) + 1)) * 3.0)
        criticality_factor = min(20.0, critical_count * 6.5)

        composite_score = min(100.0, round(fan_out_score + depth_penalty + complexity_factor + criticality_factor, 1))

        if composite_score >= 80.0:
            level = RiskLevel.CRITICAL
        elif composite_score >= 55.0:
            level = RiskLevel.HIGH
        elif composite_score >= 30.0:
            level = RiskLevel.MEDIUM
        else:
            level = RiskLevel.LOW

        # Generate actionable mitigation suggestions
        mitigations = self._generate_mitigations(target_node, impacted_nodes, level, request.change_type)

        return BlastRadiusResponse(
            target_node=target_node,
            risk_score=composite_score,
            risk_level=level,
            risk_breakdown=RiskBreakdown(
                fan_out_score=round(fan_out_score, 1),
                depth_penalty=round(depth_penalty, 1),
                complexity_weight=round(complexity_factor, 1),
                criticality_factor=round(criticality_factor, 1),
                composite_risk_score=composite_score,
                risk_level=level,
            ),
            total_impacted_nodes=len(impacted_nodes),
            impacted_nodes=impacted_nodes,
            impacted_edges=impacted_edges,
            recommended_mitigation=mitigations,
        )

    def _is_critical_node(self, node: GraphNode) -> bool:
        keywords = ["auth", "security", "api", "payment", "login", "router", "database", "main", "index", "core"]
        target = (node.name + " " + (node.file_path or "")).lower()
        return any(k in target for k in keywords)

    def _generate_mitigations(
        self,
        target: GraphNode,
        impacted: List[ImpactedNode],
        level: RiskLevel,
        change_type: Optional[str],
    ) -> List[str]:
        mitigations = []
        if level in (RiskLevel.CRITICAL, RiskLevel.HIGH):
            mitigations.append(
                f"High-impact alert: {len(impacted)} downstream components affected across {target.label}."
            )
            mitigations.append("Execute end-to-end integration and contract tests before deploying changes.")
            if any(n.node.file_path and "auth" in n.node.file_path.lower() for n in impacted):
                mitigations.append("Critical authentication paths detected in downstream blast radius — run auth regression suite.")
        else:
            mitigations.append(f"Standard regression verification recommended for {len(impacted)} downstream dependents.")

        if change_type == "SIGNATURE_CHANGE":
            mitigations.append("Method signature updated: verify all caller invocation argument types.")

        direct_callers = [n.node.label for n in impacted if n.depth == 1][:3]
        if direct_callers:
            mitigations.append(f"Validate primary dependents: {', '.join(direct_callers)}.")

        return mitigations


blast_radius_analyzer = BlastRadiusAnalyzer()
