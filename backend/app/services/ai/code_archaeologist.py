import re
from typing import List, Optional
from backend.app.core.logging import logger
from backend.app.models.schemas import (
    ArchaeologistChatRequest,
    ArchaeologistChatResponse,
    GraphNode,
    SourceCitation,
)
from backend.app.services.ai.ollama_client import ollama_client
from backend.app.services.graph.graph_service import graph_service


class CodeArchaeologist:
    """GraphRAG conversational agent for querying codebase architecture and lineage."""

    def __init__(self):
        self.ai = ollama_client
        self.graph = graph_service

    async def answer_query(self, request: ArchaeologistChatRequest) -> ArchaeologistChatResponse:
        query_text = request.query
        context_nodes: List[GraphNode] = []
        citations: List[SourceCitation] = []
        referenced_ids: List[str] = []

        # 1. Retrieve Graph Context
        all_nodes = list(self.graph.memory.nodes.values())
        query_words = set(re.findall(r"\w+", query_text.lower()))

        # Prioritize matching nodes
        scored_nodes = []
        for node in all_nodes:
            score = 0
            n_name_lower = node.name.lower()
            n_label_lower = node.label.lower()
            n_path_lower = (node.file_path or "").lower()

            for word in query_words:
                if len(word) > 2:
                    if word in n_name_lower:
                        score += 3
                    if word in n_label_lower:
                        score += 2
                    if word in n_path_lower:
                        score += 1

            if score > 0:
                scored_nodes.append((score, node))

        scored_nodes.sort(key=lambda x: x[0], reverse=True)
        top_matches = [node for _, node in scored_nodes[:5]]

        if request.context_node_id:
            focus = await self.graph.get_node(request.context_node_id)
            if focus and focus not in top_matches:
                top_matches.insert(0, focus)

        # Build context summary
        context_lines = []
        for n in top_matches:
            referenced_ids.append(n.id)
            neighbors = self.graph.memory.get_neighbors(n.id, direction="both")
            calls_out = [tgt.label for tgt, e in neighbors if e.source == n.id]
            callers_in = [src.label for src, e in neighbors if e.target == n.id]

            context_lines.append(
                f"- Node: [{n.type.value}] `{n.name}` (File: `{n.file_path or 'N/A'}`)\n"
                f"  Complexity: {n.complexity}, Calls: {calls_out[:4]}, Called By: {callers_in[:4]}"
            )

            citations.append(
                SourceCitation(
                    file_path=n.file_path or n.name,
                    symbol_name=n.label,
                    line_start=n.properties.get("start_line"),
                    line_end=n.properties.get("end_line"),
                    snippet=f"// {n.type.value} definition for {n.label}",
                )
            )

        graph_context_block = "\n".join(context_lines) if context_lines else "No specific graph nodes matched directly."

        # 2. Formulate Cypher representation
        cypher_repr = (
            f"MATCH (n)-[r]->(m) WHERE n.name =~ '(?i).*{list(query_words)[0] if query_words else '.*'}.*' RETURN n, r, m LIMIT 10"
        )

        # 3. Prompt Ollama
        system_prompt = (
            "You are the OmniTrace Code Archaeologist, an expert AI software architect who investigates "
            "code lineage, structural dependencies, and blast radiuses across large codebases. "
            "Explain codebase structure clearly with markdown headings, bullet points, and code references."
        )

        user_prompt = (
            f"Developer Query: {query_text}\n\n"
            f"Knowledge Graph Context:\n{graph_context_block}\n\n"
            f"Repository: {self.graph.memory.repo_name}\n"
            f"Total Nodes Indexed: {len(all_nodes)}\n\n"
            "Provide a comprehensive, authoritative response answering the developer's question."
        )

        ai_res = await self.ai.generate_completion(user_prompt, system_prompt)
        raw_text = ai_res.get("text", "")

        return ArchaeologistChatResponse(
            answer=raw_text,
            citations=citations,
            cypher_query_used=cypher_repr,
            referenced_node_ids=referenced_ids,
            model=ai_res.get("model", "llama3"),
        )


code_archaeologist = CodeArchaeologist()
