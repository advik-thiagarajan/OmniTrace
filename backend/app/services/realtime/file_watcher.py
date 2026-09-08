import asyncio
import os
import threading
import time
from typing import Optional
from watchdog.events import FileSystemEvent, FileSystemEventHandler
from watchdog.observers import Observer

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.models.schemas import (
    BlastRadiusRequest,
    WebSocketEventType,
)
from backend.app.services.analysis.blast_radius import blast_radius_analyzer
from backend.app.services.graph.graph_service import graph_service
from backend.app.services.parser.tree_sitter_engine import parser_engine
from backend.app.services.realtime.websocket_manager import ws_manager


class CodeMutationHandler(FileSystemEventHandler):
    """Watches file changes in local repository and triggers AST updates & WebSocket events."""

    def __init__(self, repo_path: str, loop: asyncio.AbstractEventLoop):
        super().__init__()
        self.repo_path = os.path.abspath(repo_path)
        self.loop = loop
        self.last_triggered: dict = {}
        self.debounce_seconds = settings.WATCHDOG_DEBOUNCE_MS / 1000.0

    def on_modified(self, event: FileSystemEvent):
        if event.is_directory:
            return

        file_path = event.src_path
        ext = os.path.splitext(file_path)[1].lower()
        if ext not in [".py", ".ts", ".tsx", ".js", ".jsx"]:
            return

        now = time.time()
        last_time = self.last_triggered.get(file_path, 0)
        if (now - last_time) < self.debounce_seconds:
            return
        self.last_triggered[file_path] = now

        logger.info(f"Detected file mutation: {file_path}")
        asyncio.run_coroutine_threadsafe(
            self._process_file_mutation(file_path), self.loop
        )

    async def _process_file_mutation(self, file_path: str):
        rel_path = os.path.relpath(file_path, self.repo_path).replace("\\", "/")
        parsed = parser_engine.parse_file(file_path, self.repo_path)

        # Broadcast mutation event
        await ws_manager.broadcast_event(
            WebSocketEventType.FILE_MUTATED,
            {
                "file_path": rel_path,
                "total_lines": parsed.total_lines,
                "functions_count": len(parsed.functions),
                "classes_count": len(parsed.classes),
                "timestamp": time.time(),
            },
        )

        # Try calculating real-time blast radius if file node exists
        file_node_id = f"file:{rel_path}"
        node = await graph_service.get_node(file_node_id)
        if node:
            try:
                blast_res = await blast_radius_analyzer.analyze_blast_radius(
                    BlastRadiusRequest(target_id=node.id, max_depth=3)
                )
                await ws_manager.broadcast_event(
                    WebSocketEventType.BLAST_RADIUS_ALERT,
                    {
                        "target_node_id": node.id,
                        "risk_score": blast_res.risk_score,
                        "risk_level": blast_res.risk_level.value,
                        "total_impacted": blast_res.total_impacted_nodes,
                        "impacted_node_ids": [n.node.id for n in blast_res.impacted_nodes],
                    },
                )
            except Exception as e:
                logger.debug(f"Blast radius calculation note on file update: {e}")


class FileWatcherService:
    """Manages background watchdog observer thread."""

    def __init__(self):
        self.observer: Optional[Observer] = None
        self.active_path: Optional[str] = None

    def start_watching(self, repo_path: str, loop: asyncio.AbstractEventLoop):
        self.stop_watching()
        if not os.path.exists(repo_path):
            return

        self.active_path = repo_path
        event_handler = CodeMutationHandler(repo_path, loop)
        self.observer = Observer()
        self.observer.schedule(event_handler, repo_path, recursive=True)
        self.observer.start()
        logger.info(f"Started file watcher on {repo_path}")

    def stop_watching(self):
        if self.observer:
            try:
                self.observer.stop()
                self.observer.join(timeout=2.0)
            except Exception as e:
                logger.debug(f"Error stopping observer: {e}")
            self.observer = None
            self.active_path = None


file_watcher_service = FileWatcherService()
