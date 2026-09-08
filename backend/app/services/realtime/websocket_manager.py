import asyncio
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Set
from fastapi import WebSocket, WebSocketDisconnect
from backend.app.core.logging import logger
from backend.app.models.schemas import WebSocketEventType, WebSocketMessage


class WebSocketManager:
    """Manages real-time WebSocket client connections and event broadcasting."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

        # Send welcome message
        welcome = WebSocketMessage(
            event=WebSocketEventType.CONNECTED,
            payload={
                "message": "Connected to OmniTrace Live Event Streamer",
                "connected_clients": len(self.active_connections),
                "server_time": datetime.now(timezone.utc).isoformat(),
            },
        )
        await websocket.send_text(welcome.model_dump_json())

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Remaining clients: {len(self.active_connections)}")

    async def broadcast(self, message: WebSocketMessage):
        if not self.active_connections:
            return

        payload_json = message.model_dump_json()
        dead_connections = set()

        async with self._lock:
            for connection in self.active_connections:
                try:
                    await connection.send_text(payload_json)
                except Exception as e:
                    logger.debug(f"Failed to send to client ({e}), queueing removal.")
                    dead_connections.add(connection)

            for dead in dead_connections:
                self.active_connections.discard(dead)

    async def broadcast_event(self, event_type: WebSocketEventType, payload: Dict[str, Any]):
        msg = WebSocketMessage(event=event_type, payload=payload)
        await self.broadcast(msg)


ws_manager = WebSocketManager()
