import React, { useMemo } from 'react';
import {
  Boxes,
  Code2,
  FileCode2,
  Filter,
  Flame,
  FolderTree,
  Hash,
  Layers,
  Network,
  ShieldAlert,
} from 'lucide-react';
import { useOmniStore, GraphNode } from '../../store/useOmniStore';

export const Sidebar: React.FC = () => {
  const {
    nodes,
    edges,
    selectedNode,
    setSelectedNode,
    searchQuery,
    nodeTypeFilter,
    setNodeTypeFilter,
    blastRadiusResult,
    impactedNodeIdSet,
  } = useOmniStore();

  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      // Type filter
      if (nodeTypeFilter !== 'ALL' && node.type !== nodeTypeFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          node.name.toLowerCase().includes(q) ||
          node.label.toLowerCase().includes(q) ||
          (node.file_path && node.file_path.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [nodes, nodeTypeFilter, searchQuery]);

  const fileCount = nodes.filter((n) => n.type === 'FILE').length;
  const funcCount = nodes.filter((n) => n.type === 'FUNCTION').length;
  const classCount = nodes.filter((n) => n.type === 'CLASS').length;

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'FILE':
        return <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />;
      case 'FUNCTION':
        return <Code2 className="w-3.5 h-3.5 text-purple-400" />;
      case 'CLASS':
        return <Boxes className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  return (
    <aside className="w-80 h-full border-r border-white/10 bg-command-900/80 backdrop-blur-md flex flex-col z-20 select-none">
      {/* Metrics Bar */}
      <div className="p-3 border-b border-white/10 grid grid-cols-4 gap-2 text-center bg-command-950/40">
        <div className="bg-command-900/60 p-1.5 rounded border border-white/5">
          <span className="block text-[10px] text-slate-400 uppercase font-mono">Files</span>
          <span className="text-xs font-bold text-cyan-400 font-mono">{fileCount}</span>
        </div>
        <div className="bg-command-900/60 p-1.5 rounded border border-white/5">
          <span className="block text-[10px] text-slate-400 uppercase font-mono">Funcs</span>
          <span className="text-xs font-bold text-purple-400 font-mono">{funcCount}</span>
        </div>
        <div className="bg-command-900/60 p-1.5 rounded border border-white/5">
          <span className="block text-[10px] text-slate-400 uppercase font-mono">Classes</span>
          <span className="text-xs font-bold text-amber-400 font-mono">{classCount}</span>
        </div>
        <div className="bg-command-900/60 p-1.5 rounded border border-white/5">
          <span className="block text-[10px] text-slate-400 uppercase font-mono">Edges</span>
          <span className="text-xs font-bold text-emerald-400 font-mono">{edges.length}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="p-2 border-b border-white/10 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">Type:</span>
        </div>
        <div className="flex space-x-1 bg-command-950 p-0.5 rounded border border-white/5">
          {(['ALL', 'FILE', 'FUNCTION', 'CLASS'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setNodeTypeFilter(filter)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                nodeTypeFilter === filter
                  ? 'bg-command-800 text-neon-cyan font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="text-[10px] uppercase font-mono text-slate-500 px-2 py-1 flex items-center justify-between">
          <span>Symbols ({filteredNodes.length})</span>
          {searchQuery && <span className="text-neon-cyan">Filtered</span>}
        </div>

        {filteredNodes.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500">
            No symbols match current filter.
          </div>
        ) : (
          filteredNodes.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            const isImpacted = impactedNodeIdSet.has(node.id);
            const isBlastTarget = blastRadiusResult?.target_node.id === node.id;

            return (
              <div
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className={`p-2 rounded-lg cursor-pointer transition-all border flex items-start space-x-2.5 ${
                  isSelected
                    ? 'bg-cyan-500/15 border-neon-cyan/60 shadow-sm'
                    : isBlastTarget
                    ? 'bg-red-500/20 border-red-500/80'
                    : isImpacted
                    ? 'bg-amber-500/10 border-amber-500/40'
                    : 'bg-command-950/40 hover:bg-command-800/60 border-transparent hover:border-white/10'
                }`}
              >
                <div className="mt-0.5">{getNodeIcon(node.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-medium truncate ${
                        isSelected
                          ? 'text-neon-cyan font-bold'
                          : isBlastTarget
                          ? 'text-red-400 font-bold'
                          : 'text-slate-200'
                      }`}
                    >
                      {node.label}
                    </span>
                    {node.complexity && node.complexity > 1 && (
                      <span className="text-[9px] font-mono px-1 rounded bg-command-800 text-slate-400 border border-white/5 ml-1">
                        cx:{node.complexity}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-mono truncate mt-0.5">
                    <span className="uppercase text-[9px] px-1 rounded bg-white/5 text-slate-300">
                      {node.type}
                    </span>
                    {node.file_path && <span className="truncate">{node.file_path}</span>}
                  </div>
                </div>

                {isBlastTarget && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-red-500/30 text-red-300 border border-red-500/50 flex items-center space-x-0.5">
                    <Flame className="w-2.5 h-2.5" />
                    <span>TARGET</span>
                  </span>
                )}
                {isImpacted && !isBlastTarget && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-0.5">
                    <ShieldAlert className="w-2.5 h-2.5" />
                    <span>RISK</span>
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
