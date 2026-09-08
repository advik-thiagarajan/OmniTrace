import React, { useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { Inspector } from './components/layout/Inspector';
import { TerminalConsole } from './components/layout/TerminalConsole';
import { ScanModal } from './components/layout/ScanModal';
import { ConstellationCanvas } from './components/canvas/ConstellationCanvas';
import { useOmniStore } from './store/useOmniStore';
import { fetchGraph } from './services/api';
import { wsService } from './services/websocket';

export const App: React.FC = () => {
  const { setGraphData, addLog } = useOmniStore();

  useEffect(() => {
    // Initial fetch of knowledge graph
    const loadInitialGraph = async () => {
      try {
        const data = await fetchGraph();
        setGraphData(data.repo_name, data.nodes, data.edges);
        addLog({
          type: 'INFO',
          message: `Loaded graph: ${data.total_nodes} nodes, ${data.total_edges} edges across ${data.repo_name}`,
        });
      } catch (e: any) {
        console.warn('Initial graph load notice:', e.message);
      }
    };

    loadInitialGraph();
    wsService.connect();

    return () => {
      wsService.disconnect();
    };
  }, []);

  return (
    <div className="w-screen h-screen flex flex-col bg-command-950 text-slate-100 overflow-hidden select-none">
      {/* Top Navigation Bar */}
      <Header />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Symbol Explorer */}
        <Sidebar />

        {/* Center 3D Constellation Canvas */}
        <main className="flex-1 h-full relative overflow-hidden">
          <ConstellationCanvas />
        </main>

        {/* Right Inspector / Blast Radius / Chat Panel */}
        <Inspector />
      </div>

      {/* Expandable Bottom Terminal Console */}
      <TerminalConsole />

      {/* Ingest Repository Modal */}
      <ScanModal />
    </div>
  );
};

export default App;
