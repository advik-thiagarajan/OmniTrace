import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.app.core.logging import logger
from backend.app.models.schemas import WebSocketEventType, WebSocketMessage
from backend.app.services.realtime.websocket_manager import ws_manager

router = APIRouter(tags=["WebSockets"])


@router.websocket("/ws/live-stream")
async def websocket_endpoint(websocket: WebSocket):
    """Persistent WebSocket channel streaming live mutation events and graph updates."""
    await ws_manager.connect(websocket)
    try:
        while True:
            # Handle incoming client messages / ping-pong
            data = await websocket.receive_text()
            try:
                parsed = json.loads(data)
                action = parsed.get("action")
                if action == "PING":
                    pong = WebSocketMessage(
                        event=WebSocketEventType.HEARTBEAT,
                        payload={"status": "PONG"},
                    )
                    await websocket.send_text(pong.model_dump_json())
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception as e:
        logger.debug(f"WebSocket connection error: {e}")
        await ws_manager.disconnect(websocket)
