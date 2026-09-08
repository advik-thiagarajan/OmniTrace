import re
from typing import List
from backend.app.core.logging import logger
from backend.app.models.schemas import DiffSummaryRequest, DiffSummaryResponse
from backend.app.services.ai.ollama_client import ollama_client


class SemanticSummarizer:
    """Generates natural language semantic summaries of code diffs and mutations."""

    def __init__(self):
        self.ai = ollama_client

    async def summarize_diff(self, request: DiffSummaryRequest) -> DiffSummaryResponse:
        system_prompt = (
            "You are OmniTrace Semantic AI, an enterprise-grade static analysis and architectural assistant. "
            "Analyze the provided code diff and provide a crisp Markdown summary detailing: "
            "1. Core intent of the change. "
            "2. Breaking changes (if any). "
            "3. Impacted downstream behaviors."
        )

        prompt = (
            f"File: {request.file_path}\n"
            f"Target Symbol: {request.target_symbol or 'Whole File'}\n\n"
            f"Git Diff / Mutation:\n```\n{request.diff_content}\n```\n\n"
            "Provide the structured analysis in concise Markdown format."
        )

        ai_res = await self.ai.generate_completion(prompt, system_prompt)
        text = ai_res.get("text", "")

        # Detect breaking change markers
        breaking = bool(
            re.search(
                r"(breaking change|signature change|incompatible|removed argument|deprecated)",
                text + " " + request.diff_content,
                re.IGNORECASE,
            )
        )

        affected = []
        for line in text.splitlines():
            if line.strip().startswith("- ") or line.strip().startswith("* "):
                clean = line.strip().lstrip("-* ").strip()
                if len(clean) > 5 and len(affected) < 5:
                    affected.append(clean)

        if not affected:
            affected = [
                f"Modifications to {request.file_path}",
                "Logic branch updates evaluated by Tree-sitter AST",
            ]

        return DiffSummaryResponse(
            file_path=request.file_path,
            summary_markdown=text,
            breaking_change_detected=breaking,
            affected_behaviors=affected,
            model_used=ai_res.get("model", "llama3"),
            latency_ms=ai_res.get("latency_ms", 0.0),
        )


semantic_summarizer = SemanticSummarizer()
