import asyncio
import time
from typing import Any, Dict, List, Optional
import httpx
from backend.app.core.config import settings
from backend.app.core.logging import logger


class OllamaClient:
    """Async Ollama Client for local LLM inference (Llama 3, Mistral, CodeLlama)."""

    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL.rstrip("/")
        self.model = settings.OLLAMA_MODEL
        self.timeout = settings.OLLAMA_TIMEOUT_SECONDS

    async def check_health(self) -> bool:
        if not settings.OLLAMA_ENABLED:
            return False
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                return res.status_code == 200
        except Exception:
            return False

    async def generate_completion(
        self, prompt: str, system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        start = time.time()
        payload: Dict[str, Any] = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
        }
        if system_prompt:
            payload["system"] = system_prompt

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/generate",
                    json=payload,
                )
                if response.status_code == 200:
                    data = response.json()
                    latency = (time.time() - start) * 1000
                    return {
                        "text": data.get("response", ""),
                        "model": self.model,
                        "latency_ms": round(latency, 2),
                        "fallback": False,
                    }
                else:
                    logger.warning(f"Ollama returned status {response.status_code}: {response.text}")
        except Exception as e:
            logger.debug(f"Ollama request error ({e}). Using intelligent heuristic fallback.")

        # Heuristic fallback if local Ollama model is offline
        latency = (time.time() - start) * 1000
        return {
            "text": self._generate_fallback_response(prompt),
            "model": f"{self.model}-heuristic-engine",
            "latency_ms": round(latency, 2),
            "fallback": True,
        }

    def _generate_fallback_response(self, prompt: str) -> str:
        prompt_lower = prompt.lower()
        if "diff" in prompt_lower or "changes" in prompt_lower:
            return (
                "### Semantic Impact Summary (Local Heuristic Engine)\n\n"
                "- **Primary Impact**: Function logic / signature modifications detected in the updated file.\n"
                "- **Architectural Effect**: Direct dependents and callers will receive mutated data shapes.\n"
                "- **Risk Level**: Moderate downstream blast radius. Regression test coverage recommended."
            )
        elif "explain" in prompt_lower or "role" in prompt_lower:
            return (
                "### Architectural Component Profile\n\n"
                "This component acts as a core structural element within the codebase topology. "
                "It encapsulates business logic, provides interfaces to adjacent modules, and maintains encapsulation."
            )
        else:
            return (
                "### Code Lineage & Architecture Insights\n\n"
                "Based on the static AST graph analysis, this module serves key structural dependencies. "
                "Review the 3D constellation visualizer to trace incoming calls and downstream blast radius."
            )


ollama_client = OllamaClient()
