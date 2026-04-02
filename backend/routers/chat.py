from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json

router = APIRouter(prefix="/ws", tags=["Chat"])

class ConnectionManager:
    def __init__(self):
        # active_connections: { project_id: [websocket1, websocket2, ...] }
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, project_id: str):
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = []
        self.active_connections[project_id].append(websocket)

    def disconnect(self, websocket: WebSocket, project_id: str):
        if project_id in self.active_connections:
            self.active_connections[project_id].remove(websocket)
            if not self.active_connections[project_id]:
                del self.active_connections[project_id]

    async def broadcast(self, message: str, project_id: str):
        if project_id in self.active_connections:
            for connection in self.active_connections[project_id]:
                await connection.send_text(message)

manager = ConnectionManager()

@router.websocket("/chat/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str):
    await manager.connect(websocket, project_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Expecting data to be a JSON string with 'user', 'message', 'type'
            await manager.broadcast(data, project_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, project_id)
    except Exception as e:
        print(f"WS Error: {e}")
        manager.disconnect(websocket, project_id)
