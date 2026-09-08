import React, { useState } from 'react';
import {
  Activity,
  FolderGit2,
  Layers,
  Play,
  Radio,
  Search,
  Zap,
  Terminal,
  Cpu,
  Flame,
} from 'lucide-react';
import { useOmniStore } from '../../store/useOmniStore';
import { simulateMutation } from '../../services/api';

export const Header: React.FC = () => {
  const {
    repoName,
    nodes,
    edges,
    wsConnected,
    searchQuery,
    setSearchQuery,
    setIsScanModalOpen,
    selectedNode,
    toggleTerminal,
    isTerminalOpen,
    activeTab,
    setActiveTab,
  } = useOmniStore();

  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulate = async () => {
    if (!selectedNode && nodes.length === 0) return;
    const targetId = selectedNode ? selectedNode.id : nodes[0].id;
    setIsSimulating(true);
    try {
      await simulateMutation(targetId);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setIsSimulating(false), 800);
    }
  };

  return (
    <header className="h-14 border-b border-white/10 bg-command-900/90 backdrop-blur-md px-4 flex items-center justify-between z-30 select-none">
      {/* Brand & Repo Info */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-neon-cyan via-neon-blue to-neon-purple flex items-center justify-center shadow-glow-cyan">
            <Activity className="w-5 h-5 text-command-950 font-black" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm tracking-wider uppercase bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                OmniTrace
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-neon-cyan border border-cyan-500/30">
                v1.0-alpha
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono flex items-center space-x-1">
              <span>Repo:</span>
              <span className="text-slate-200 font-medium">{repoName}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsScanModalOpen(true)}
          className="ml-3 flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-md bg-command-800 hover:bg-command-700 text-slate-300 hover:text-white border border-white/10 transition-colors"
          title="Ingest / Scan Repository"
        >
          <FolderGit2 className="w-3.5 h-3.5 text-neon-cyan" />
          <span>Ingest Repo</span>
        </button>
      </div>

      {/* Center Search Bar */}
      <div className="flex-1 max-w-md mx-6">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files, functions, classes, AST symbols..."
            className="w-full bg-command-950/80 border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Right Controls & Navigation */}
      <div className="flex items-center space-x-3">
        {/* Navigation Tabs */}
        <div className="flex items-center bg-command-950/90 rounded-lg p-0.5 border border-white/10 text-xs">
          <button
            onClick={() => setActiveTab('inspector')}
            className={`px-2.5 py-1 rounded-md flex items-center space-x-1 transition-all ${
              activeTab === 'inspector'
                ? 'bg-command-800 text-neon-cyan shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Inspector</span>
          </button>
          <button
            onClick={() => setActiveTab('blast')}
            className={`px-2.5 py-1 rounded-md flex items-center space-x-1 transition-all ${
              activeTab === 'blast'
                ? 'bg-command-800 text-neon-magenta shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Blast Radius</span>
          </button>
          <button
            onClick={() => setActiveTab('archaeologist')}
            className={`px-2.5 py-1 rounded-md flex items-center space-x-1 transition-all ${
              activeTab === 'archaeologist'
                ? 'bg-command-800 text-neon-purple shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>AI Archaeologist</span>
          </button>
        </div>

        {/* Live Simulation Button */}
        <button
          onClick={handleSimulate}
          disabled={isSimulating}
          className={`flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-md font-medium border transition-all ${
            isSimulating
              ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
              : 'bg-gradient-to-r from-cyan-600/20 to-blue-600/20 hover:from-cyan-600/30 hover:to-blue-600/30 text-neon-cyan border-cyan-500/40'
          }`}
          title="Simulate a live code edit mutation to test 3D pulses & real-time events"
        >
          <Zap className="w-3.5 h-3.5 text-neon-cyan" />
          <span>{isSimulating ? 'Mutating...' : 'Simulate Mutation'}</span>
        </button>

        {/* Live WebSocket Status */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-command-950 border border-white/10 text-[11px] font-mono">
          <span
            className={`w-2 h-2 rounded-full ${
              wsConnected ? 'bg-emerald-400 shadow-glow-cyan animate-pulse' : 'bg-red-500'
            }`}
          />
          <span className={wsConnected ? 'text-emerald-400' : 'text-red-400'}>
            {wsConnected ? 'STREAM LIVE' : 'DISCONNECTED'}
          </span>
        </div>

        {/* Terminal Toggle */}
        <button
          onClick={toggleTerminal}
          className={`p-1.5 rounded-md border transition-colors ${
            isTerminalOpen
              ? 'bg-command-800 text-neon-cyan border-neon-cyan/40'
              : 'bg-command-950 text-slate-400 border-white/10 hover:text-white'
          }`}
          title="Toggle Bottom Terminal Logs"
        >
          <Terminal className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
