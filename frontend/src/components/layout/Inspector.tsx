import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  Code2,
  Cpu,
  FileCode2,
  Flame,
  Layers,
  MessageSquareCode,
  Play,
  Send,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useOmniStore } from '../../store/useOmniStore';
import { calculateBlastRadius, summarizeDiff, askCodeArchaeologist } from '../../services/api';

export const Inspector: React.FC = () => {
  const {
    selectedNode,
    activeTab,
    setActiveTab,
    blastRadiusResult,
    setBlastRadiusResult,
    isCalculatingBlastRadius,
    setIsCalculatingBlastRadius,
    chatMessages,
    addChatMessage,
    isChatLoading,
    setIsChatLoading,
  } = useOmniStore();

  const [chatInput, setChatInput] = useState('');
  const [diffInput, setDiffInput] = useState(
    '@@ -12,4 +12,5 @@\n async def login(username: str, token: str):\n-    return db.verify(username)\n+    # Breaking change: added strict JWT signature verification\n+    return auth_engine.verify_jwt_token(username, token, strict=True)'
  );
  const [diffSummary, setDiffSummary] = useState<any | null>(null);
  const [isDiffLoading, setIsDiffLoading] = useState(false);

  // Run blast radius on selected node
  const handleCalculateBlastRadius = async () => {
    if (!selectedNode) return;
    setIsCalculatingBlastRadius(true);
    try {
      const res = await calculateBlastRadius(selectedNode.id, 4);
      setBlastRadiusResult(res);
      setActiveTab('blast');
    } catch (e: any) {
      console.error('Blast radius calculation failed:', e);
    } finally {
      setIsCalculatingBlastRadius(false);
    }
  };

  // Run diff summarizer
  const handleSummarizeDiff = async () => {
    setIsDiffLoading(true);
    try {
      const res = await summarizeDiff(selectedNode?.file_path || 'app/core/auth.py', diffInput);
      setDiffSummary(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDiffLoading(false);
    }
  };

  // Run chat query
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const query = chatInput.trim();
    setChatInput('');
    addChatMessage({ sender: 'user', text: query });
    setIsChatLoading(true);

    try {
      const res = await askCodeArchaeologist(query, selectedNode?.id);
      addChatMessage({
        sender: 'assistant',
        text: res.answer,
        citations: res.citations,
        cypher_query: res.cypher_query_used,
      });
    } catch (e: any) {
      addChatMessage({
        sender: 'assistant',
        text: `Error querying Code Archaeologist: ${e.message}`,
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <aside className="w-96 h-full border-l border-white/10 bg-command-900/85 backdrop-blur-md flex flex-col z-20 select-none">
      {/* Tab Navigation */}
      <div className="flex border-b border-white/10 bg-command-950/60 p-1 text-xs font-mono">
        <button
          onClick={() => setActiveTab('inspector')}
          className={`flex-1 py-1.5 rounded-md flex items-center justify-center space-x-1 transition-all ${
            activeTab === 'inspector'
              ? 'bg-command-800 text-neon-cyan font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Inspector</span>
        </button>
        <button
          onClick={() => setActiveTab('blast')}
          className={`flex-1 py-1.5 rounded-md flex items-center justify-center space-x-1 transition-all ${
            activeTab === 'blast'
              ? 'bg-command-800 text-neon-magenta font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Blast Radius</span>
        </button>
        <button
          onClick={() => setActiveTab('diff')}
          className={`flex-1 py-1.5 rounded-md flex items-center justify-center space-x-1 transition-all ${
            activeTab === 'diff'
              ? 'bg-command-800 text-neon-blue font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Diff</span>
        </button>
        <button
          onClick={() => setActiveTab('archaeologist')}
          className={`flex-1 py-1.5 rounded-md flex items-center justify-center space-x-1 transition-all ${
            activeTab === 'archaeologist'
              ? 'bg-command-800 text-neon-purple font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Chat</span>
        </button>
      </div>

      {/* Tab 1: Node Inspector */}
      {activeTab === 'inspector' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {selectedNode ? (
            <>
              {/* Header card */}
              <div className="p-3.5 rounded-xl bg-command-950 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-neon-cyan border border-cyan-500/30">
                    {selectedNode.type}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Lang: {selectedNode.language || 'N/A'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white font-mono break-all">
                  {selectedNode.label}
                </h3>
                <p className="text-xs text-slate-400 font-mono break-all">
                  {selectedNode.name}
                </p>
                {selectedNode.file_path && (
                  <p className="text-[11px] text-slate-500 font-mono">
                    Path: {selectedNode.file_path}
                  </p>
                )}
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-command-950 border border-white/5">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">
                    Complexity
                  </span>
                  <span className="text-sm font-bold text-amber-400 font-mono">
                    {selectedNode.complexity || 1}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-command-950 border border-white/5">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">
                    Fan-In (Callers)
                  </span>
                  <span className="text-sm font-bold text-cyan-400 font-mono">
                    {selectedNode.fan_in || 0}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-command-950 border border-white/5">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">
                    Fan-Out (Calls)
                  </span>
                  <span className="text-sm font-bold text-purple-400 font-mono">
                    {selectedNode.fan_out || 0}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleCalculateBlastRadius}
                  disabled={isCalculatingBlastRadius}
                  className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-red-600/30 to-orange-600/30 hover:from-red-600/40 hover:to-orange-600/40 border border-red-500/40 text-red-300 font-semibold text-xs flex items-center justify-center space-x-2 transition-all shadow-sm"
                >
                  <Flame className="w-4 h-4 text-neon-magenta" />
                  <span>
                    {isCalculatingBlastRadius
                      ? 'Simulating Traversal...'
                      : 'Calculate Predictive Blast Radius'}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('archaeologist');
                    setChatInput(`Explain the architecture and risk profile of ${selectedNode.label}`);
                  }}
                  className="w-full py-2 px-4 rounded-lg bg-command-800 hover:bg-command-700 border border-white/10 text-slate-300 hover:text-white text-xs flex items-center justify-center space-x-2 transition-all"
                >
                  <MessageSquareCode className="w-3.5 h-3.5 text-neon-purple" />
                  <span>Ask Code Archaeologist</span>
                </button>
              </div>

              {/* Properties & AST details */}
              {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 && (
                <div className="p-3 rounded-lg bg-command-950/60 border border-white/5 space-y-2">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block font-semibold">
                    AST Properties
                  </span>
                  <div className="text-[11px] font-mono text-slate-300 space-y-1">
                    {selectedNode.properties.parameters && (
                      <div>
                        <span className="text-slate-500">Parameters: </span>
                        <span>
                          ({(selectedNode.properties.parameters as string[]).join(', ')})
                        </span>
                      </div>
                    )}
                    {selectedNode.properties.start_line && (
                      <div>
                        <span className="text-slate-500">Lines: </span>
                        <span>
                          {selectedNode.properties.start_line} - {selectedNode.properties.end_line}
                        </span>
                      </div>
                    )}
                    {selectedNode.properties.docstring && (
                      <div className="mt-2 p-2 rounded bg-command-900 border border-white/5 text-[11px] italic text-slate-400">
                        "{selectedNode.properties.docstring}"
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <Layers className="w-10 h-10 stroke-1 mb-2 opacity-40 text-cyan-400" />
              <p className="text-xs font-mono">Select a node in the 3D constellation or sidebar to inspect.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Blast Radius */}
      {activeTab === 'blast' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {blastRadiusResult ? (
            <>
              {/* Risk Dial Card */}
              <div className="p-4 rounded-xl bg-command-950 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono text-slate-400">
                    Downstream Risk Score
                  </span>
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                      blastRadiusResult.risk_level === 'CRITICAL'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                        : blastRadiusResult.risk_level === 'HIGH'
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                        : blastRadiusResult.risk_level === 'MEDIUM'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    }`}
                  >
                    {blastRadiusResult.risk_level}
                  </span>
                </div>

                <div className="flex items-baseline space-x-2">
                  <span className="text-4xl font-black font-mono text-white">
                    {blastRadiusResult.risk_score}
                  </span>
                  <span className="text-xs font-mono text-slate-500">/ 100</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-command-900 rounded-full h-2 overflow-hidden border border-white/5">
                  <div
                    className={`h-full transition-all duration-700 ${
                      blastRadiusResult.risk_score >= 80
                        ? 'bg-red-500 shadow-glow-danger'
                        : blastRadiusResult.risk_score >= 55
                        ? 'bg-orange-500'
                        : blastRadiusResult.risk_score >= 30
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${blastRadiusResult.risk_score}%` }}
                  />
                </div>

                <p className="text-xs text-slate-300 font-mono">
                  Target: <span className="font-bold text-neon-cyan">{blastRadiusResult.target_node.label}</span>
                </p>
              </div>

              {/* Risk Breakdown */}
              <div className="p-3 rounded-lg bg-command-950/60 border border-white/5 space-y-1.5 text-xs font-mono">
                <span className="text-[10px] uppercase text-slate-400 font-bold block">
                  Scoring Factors Breakdown
                </span>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-500">Fan-Out Score:</span>
                  <span>{blastRadiusResult.risk_breakdown.fan_out_score} pts</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-500">Depth Penalty:</span>
                  <span>{blastRadiusResult.risk_breakdown.depth_penalty} pts</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-500">Complexity Weight:</span>
                  <span>{blastRadiusResult.risk_breakdown.complexity_weight} pts</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-500">Criticality Factor:</span>
                  <span>{blastRadiusResult.risk_breakdown.criticality_factor} pts</span>
                </div>
              </div>

              {/* Mitigation Suggestions */}
              {blastRadiusResult.recommended_mitigation.length > 0 && (
                <div className="p-3 rounded-lg bg-command-950/80 border border-cyan-500/20 space-y-2">
                  <span className="text-[10px] uppercase font-mono text-neon-cyan font-bold flex items-center space-x-1">
                    <ShieldAlert className="w-3 h-3" />
                    <span>Recommended Mitigations</span>
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-300 font-mono">
                    {blastRadiusResult.recommended_mitigation.map((m, idx) => (
                      <li key={idx} className="flex items-start space-x-1.5">
                        <span className="text-neon-cyan mt-0.5">•</span>
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Impacted Nodes List */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">
                  Impacted Downstream Nodes ({blastRadiusResult.total_impacted_nodes})
                </span>
                <div className="space-y-1.5">
                  {blastRadiusResult.impacted_nodes.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-command-950 border border-white/5 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-slate-200 truncate">
                          {item.node.label}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                          Hop {item.depth}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {item.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <Flame className="w-10 h-10 stroke-1 mb-2 opacity-40 text-red-400" />
              <p className="text-xs font-mono">
                Click "Calculate Predictive Blast Radius" on any node to evaluate downstream risk.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: AI Semantic Diff Summarizer */}
      {activeTab === 'diff' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">
              Git Diff / Code Mutation Input
            </label>
            <textarea
              rows={5}
              value={diffInput}
              onChange={(e) => setDiffInput(e.target.value)}
              className="w-full bg-command-950 border border-white/10 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-neon-cyan"
            />
            <button
              onClick={handleSummarizeDiff}
              disabled={isDiffLoading}
              className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-blue-600/30 to-cyan-600/30 hover:from-blue-600/40 hover:to-cyan-600/40 border border-cyan-500/40 text-neon-cyan font-semibold text-xs flex items-center justify-center space-x-2 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isDiffLoading ? 'Analyzing Semantics...' : 'Summarize Diff via Ollama'}</span>
            </button>
          </div>

          {diffSummary && (
            <div className="p-3.5 rounded-xl bg-command-950 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono text-slate-400">
                  AI Summary ({diffSummary.model_used})
                </span>
                {diffSummary.breaking_change_detected && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/20 text-red-400 border border-red-500/40 flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>BREAKING</span>
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
                {diffSummary.summary_markdown}
              </div>

              {diffSummary.affected_behaviors?.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">
                    Key Affected Behaviors:
                  </span>
                  <ul className="space-y-1 text-xs text-slate-300 font-mono">
                    {diffSummary.affected_behaviors.map((b: string, i: number) => (
                      <li key={i} className="flex items-start space-x-1.5">
                        <span className="text-cyan-400">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Natural Language Code Archaeologist Chat */}
      {activeTab === 'archaeologist' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Chat message stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded-xl text-xs font-mono space-y-1.5 ${
                  msg.sender === 'user'
                    ? 'bg-cyan-500/10 border border-neon-cyan/30 text-cyan-200 ml-6'
                    : 'bg-command-950 border border-white/10 text-slate-200 mr-4'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-bold uppercase">
                    {msg.sender === 'user' ? 'Developer' : 'Code Archaeologist'}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>
                <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>

                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/10 space-y-1 text-[10px]">
                    <span className="text-slate-500 uppercase font-semibold">Citations:</span>
                    {msg.citations.map((c, i) => (
                      <div key={i} className="text-neon-cyan">
                        • {c.file_path} {c.symbol_name ? `(${c.symbol_name})` : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isChatLoading && (
              <div className="p-3 rounded-xl bg-command-950 border border-white/10 text-xs font-mono text-neon-purple animate-pulse flex items-center space-x-2">
                <Cpu className="w-4 h-4 animate-spin" />
                <span>Archaeologist searching AST knowledge graph & querying local AI...</span>
              </div>
            )}
          </div>

          {/* Chat input form */}
          <form onSubmit={handleSendChat} className="p-3 border-t border-white/10 bg-command-950">
            <div className="flex space-x-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about dependencies, lineages, blast radius..."
                className="flex-1 bg-command-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-neon-purple font-mono"
              />
              <button
                type="submit"
                disabled={isChatLoading || !chatInput.trim()}
                className="p-2 rounded-lg bg-neon-purple/20 hover:bg-neon-purple/30 border border-neon-purple/40 text-neon-purple disabled:opacity-40 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </aside>
  );
};
