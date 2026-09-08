import { useOmniStore } from '../store/useOmniStore';

class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectInterval: number = 3000;
  private shouldReconnect: boolean = true;

  public connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/live-stream`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        useOmniStore.getState().setWsConnected(true);
        useOmniStore.getState().addLog({
          type: 'INFO',
          message: 'Connected to OmniTrace Live Event Streamer',
        });
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleEvent(data);
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      this.socket.onclose = () => {
        useOmniStore.getState().setWsConnected(false);
        if (this.shouldReconnect) {
          setTimeout(() => this.connect(), this.reconnectInterval);
        }
      };

      this.socket.onerror = (err) => {
        console.warn('WebSocket encountered error:', err);
      };
    } catch (e) {
      console.error('Failed to initiate WebSocket:', e);
    }
  }

  private handleEvent(message: any) {
    const store = useOmniStore.getState();
    const eventType = message.event;
    const payload = message.payload || {};

    switch (eventType) {
      case 'CONNECTED':
        store.addLog({
          type: 'INFO',
          message: payload.message || 'Live channel active',
          details: payload,
        });
        break;

      case 'FILE_MUTATED':
        store.addLog({
          type: 'MUTATION',
          message: `Code mutation detected in ${payload.file_path}`,
          details: payload,
        });
        // Find matching node and trigger pulse
        const targetNode = store.nodes.find(
          (n) => n.file_path === payload.file_path || n.name === payload.file_path
        );
        if (targetNode) {
          store.triggerPulse([targetNode.id]);
        }
        break;

      case 'GRAPH_UPDATED':
        store.addLog({
          type: 'GRAPH',
          message: `Knowledge graph synced: ${payload.total_nodes} nodes, ${payload.total_edges} edges`,
        });
        break;

      case 'BLAST_RADIUS_ALERT':
        store.addLog({
          type: 'BLAST_RADIUS',
          message: `Blast radius alert for ${payload.target_node_id} (Risk: ${payload.risk_score} - ${payload.risk_level})`,
          details: payload,
        });
        if (payload.impacted_node_ids) {
          store.triggerPulse([payload.target_node_id, ...payload.impacted_node_ids]);
        }
        break;

      case 'SIMULATION_EVENT':
        store.addLog({
          type: 'ALERT',
          message: `[Live Simulation] ${payload.message}`,
          details: payload,
        });
        if (payload.node_id) {
          store.triggerPulse([payload.node_id]);
        }
        break;

      default:
        break;
    }
  }

  public disconnect() {
    this.shouldReconnect = false;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const wsService = new WebSocketService();
