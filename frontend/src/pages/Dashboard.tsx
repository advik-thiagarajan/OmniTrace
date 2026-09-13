import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  FolderGit2,
  Zap,
  Search,
  X,
  Flame,
  Layers,
  FileCode,
  ShieldAlert,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { ConstellationCanvas } from '../components/canvas/ConstellationCanvas';
import { IngestionModal } from '../components/IngestionModal';
import { useOmniStore } from '../store/useOmniStore';
import { fetchGraph, simulateMutation } from '../services/api';
import { wsService } from '../services/websocket';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    repoName,
    nodes,
    edges,
    wsConnected,
    searchQuery,
    setSearchQuery,
    selectedNode,
    setSelectedNode,
    setIsScanModalOpen,
    setGraphData,
    addLog,
    blastRadiusResult,
    highlightColor,
  } = useOmniStore();

  const [isSimulating, setIsSimulating] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

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

  const handleSimulate = async () => {
    if (!selectedNode && nodes.length === 0) return;
    const targetId = selectedNode ? selectedNode.id : nodes[0]?.id;
    if (!targetId) return;

    setIsSimulating(true);
    try {
      await simulateMutation(targetId);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setIsSimulating(false), 800);
    }
  };

  // Filter nodes for search bar quick finder
  const matchingNodes = searchQuery.trim()
    ? nodes.filter(
        (n) =>
          n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (n.file_path && n.file_path.toLowerCase().includes(searchQuery.toLowerCase()))
      ).slice(0, 6)
    : [];

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-[#07090e] select-none">
      {/* 100% Viewport 3D Graph Canvas */}
      <div className="absolute inset-0 w-full h-full z-0">
        <ConstellationCanvas />
      </div>

      {/* Sleek Minimal Floating Top HUD */}
      <header className="absolute top-4 left-4 right-4 z-20 pointer-events-none flex items-center justify-between">
        {/* Brand & Home Navigation */}
        <div className="pointer-events-auto flex items-center space-x-2">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-[#0b0f19]/80 backdrop-blur-md border border-white/15 text-slate-300 hover:text-white hover:border-neon-cyan/40 hover:bg-[#101626]/90 transition-all shadow-xl group"
            title="Return to Landing Page"
          >
            <ArrowLeft className="w-4 h-4 text-neon-cyan transform group-hover:-translate-x-0.5 transition-transform" />
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-neon-cyan to-neon-purple flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-[#07090e]" />
              </div>
              <span className="font-bold text-xs tracking-wider uppercase bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                OmniTrace
              </span>
            </div>
          </button>

          {/* Repository Badge */}
          <div className="hidden sm:flex items-center space-x-2 px-3 py-2 rounded-xl bg-[#0b0f19]/80 backdrop-blur-md border border-white/10 text-xs font-mono text-slate-300 shadow-xl">
            <span className="text-slate-500">Repo:</span>
            <span className="text-neon-cyan font-medium">{repoName}</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">{nodes.length} nodes</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">{edges.length} edges</span>
          </div>
        </div>

        {/* Floating Quick Search Bar */}
        <div className="pointer-events-auto hidden md:block relative w-80">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              placeholder="Quick search nodes..."
              className="w-full bg-[#0b0f19]/80 backdrop-blur-md border border-white/15 rounded-xl pl-9 pr-8 py-2 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan shadow-xl transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setShowSearchDropdown(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Dropdown Results */}
          {showSearchDropdown && matchingNodes.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 rounded-xl bg-[#0b0f19]/95 backdrop-blur-xl border border-white/15 shadow-2xl p-1.5 space-y-1 z-30 font-mono text-xs max-h-60 overflow-y-auto">
              {matchingNodes.map((node) => (
                <button
                  key={node.id}
                  onClick={() => {
                    setSelectedNode(node);
                    setShowSearchDropdown(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center justify-between text-slate-300 hover:text-white transition-colors"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-neon-cyan shrink-0" />
                    <span className="font-medium truncate">{node.label}</span>
                  </div>
                  <span className="text-[10px] uppercase px-1 rounded bg-white/10 text-slate-400">
                    {node.type}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Floating Actions */}
        <div className="pointer-events-auto flex items-center space-x-2.5">
          {/* Ingest Repository Trigger */}
          <button
            onClick={() => setIsScanModalOpen(true)}
            className="flex items-center space-x-1.5 text-xs font-mono px-3 py-2 rounded-xl bg-[#0b0f19]/80 hover:bg-[#101626] backdrop-blur-md border border-white/15 hover:border-neon-cyan/40 text-slate-200 hover:text-white shadow-xl transition-all"
            title="Ingest Repository"
          >
            <FolderGit2 className="w-3.5 h-3.5 text-neon-cyan" />
            <span className="hidden sm:inline">Ingest Repo</span>
          </button>

          {/* Simulate Mutation Trigger */}
          <button
            onClick={handleSimulate}
            disabled={isSimulating}
            className={`flex items-center space-x-1.5 text-xs font-mono px-3 py-2 rounded-xl backdrop-blur-md border shadow-xl transition-all ${
              isSimulating
                ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                : 'bg-gradient-to-r from-neon-cyan/15 to-neon-blue/15 hover:from-neon-cyan/25 hover:to-neon-blue/25 text-neon-cyan border-neon-cyan/40'
            }`}
            title="Simulate a live code edit mutation"
          >
            <Zap className="w-3.5 h-3.5 text-neon-cyan" />
            <span className="hidden sm:inline">{isSimulating ? 'Mutating...' : 'Simulate'}</span>
          </button>

          {/* Live WebSocket Status Pill */}
          <div className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#0b0f19]/80 backdrop-blur-md border border-white/15 text-[11px] font-mono shadow-xl">
            <span
              className={`w-2 h-2 rounded-full ${
                wsConnected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse' : 'bg-red-500'
              }`}
            />
            <span className={wsConnected ? 'text-emerald-400 hidden sm:inline' : 'text-red-400 hidden sm:inline'}>
              {wsConnected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </header>

      {/* Floating Selected Node Info Card (Compact, Non-obstructive) */}
      {selectedNode && (
        <div className="absolute bottom-6 right-6 z-20 pointer-events-auto max-w-sm w-full animate-in slide-in-from-bottom-5 duration-300">
          <div className="p-4 rounded-2xl bg-[#0b0f19]/90 backdrop-blur-xl border border-white/15 shadow-2xl space-y-3 font-mono">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center text-neon-cyan">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white tracking-wide truncate max-w-[200px]">
                    {selectedNode.label}
                  </h4>
                  <span className="text-[10px] uppercase text-neon-cyan font-semibold">
                    {selectedNode.type}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {selectedNode.file_path && (
              <div className="text-[11px] text-slate-300 break-all bg-[#07090e]/60 p-2 rounded-lg border border-white/5">
                {selectedNode.file_path}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                <span className="text-slate-500 block">Complexity:</span>
                <span className="text-slate-200 font-semibold">{selectedNode.complexity ?? 'N/A'}</span>
              </div>
              <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                <span className="text-slate-500 block">Risk Score:</span>
                <span className={`font-semibold ${selectedNode.risk_score && selectedNode.risk_score > 70 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {selectedNode.risk_score ? `${selectedNode.risk_score}/100` : 'Low (0)'}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-1 flex items-center justify-between">
              <button
                onClick={handleSimulate}
                className="w-full text-xs py-1.5 rounded-lg bg-neon-cyan/10 hover:bg-neon-cyan/20 border border-neon-cyan/30 text-neon-cyan font-semibold flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Zap className="w-3 h-3" />
                <span>Simulate Node Mutation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ingest Repository Modal */}
      <IngestionModal />
    </div>
  );
};

export default Dashboard;
