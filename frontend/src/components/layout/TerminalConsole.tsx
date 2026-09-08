import React from 'react';
import { ChevronDown, ChevronUp, Clock, Terminal, Trash2, Zap } from 'lucide-react';
import { useOmniStore } from '../../store/useOmniStore';

export const TerminalConsole: React.FC = () => {
  const { isTerminalOpen, toggleTerminal, liveLogs } = useOmniStore();

  if (!isTerminalOpen) return null;

  const getLogBadge = (type: string) => {
    switch (type) {
      case 'MUTATION':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
            MUTATION
          </span>
        );
      case 'BLAST_RADIUS':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-red-500/20 text-red-300 border border-red-500/30">
            BLAST_RADIUS
          </span>
        );
      case 'GRAPH':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            GRAPH_SYNC
          </span>
        );
      case 'ALERT':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
            SIMULATION
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-500/20 text-slate-300 border border-slate-500/30">
            STREAM
          </span>
        );
    }
  };

  return (
    <div className="h-44 border-t border-white/10 bg-command-950/95 backdrop-blur-md flex flex-col z-20 select-none">
      {/* Terminal Title Bar */}
      <div className="h-7 px-3 bg-command-900/90 border-b border-white/5 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2">
          <Terminal className="w-3.5 h-3.5 text-neon-cyan" />
          <span className="font-bold text-slate-300 text-[11px]">
            OMNITRACE LIVE EVENT STREAMER & CYPHER MONITOR
          </span>
          <span className="text-[10px] text-slate-500">
            ({liveLogs.length} events recorded)
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleTerminal}
            className="text-slate-400 hover:text-white p-0.5"
            title="Collapse Terminal"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Log Output Stream */}
      <div className="flex-1 overflow-y-auto p-2.5 font-mono text-[11px] space-y-1">
        {liveLogs.length === 0 ? (
          <div className="text-slate-500 text-xs py-2">
            Awaiting WebSocket stream events and file mutation hooks...
          </div>
        ) : (
          liveLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start space-x-2 py-0.5 px-1.5 rounded hover:bg-white/5 transition-colors"
            >
              <span className="text-slate-500 flex items-center space-x-1 shrink-0">
                <Clock className="w-2.5 h-2.5" />
                <span>{log.timestamp}</span>
              </span>
              <div className="shrink-0">{getLogBadge(log.type)}</div>
              <span className="text-slate-200 break-all">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
