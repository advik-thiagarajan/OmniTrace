import React, { useState } from 'react';
import { FolderGit2, Loader2, Sparkles, X } from 'lucide-react';
import { useOmniStore } from '../../store/useOmniStore';
import { analyzeRepository, fetchGraph } from '../../services/api';

export const ScanModal: React.FC = () => {
  const { isScanModalOpen, setIsScanModalOpen, setGraphData } = useOmniStore();
  const [repoPath, setRepoPath] = useState('backend');
  const [repoName, setRepoName] = useState('OmniTrace-Core');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isScanModalOpen) return null;

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoPath.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMsg(null);
    try {
      await analyzeRepository(repoPath.trim(), repoName.trim() || undefined);
      const graphRes = await fetchGraph();
      setGraphData(graphRes.repo_name, graphRes.nodes, graphRes.edges);
      setIsScanModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to analyze repository');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-command-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 bg-command-950 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center text-neon-cyan">
              <FolderGit2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Ingest Repository</h3>
              <p className="text-[11px] text-slate-400">Tree-sitter AST & Knowledge Graph Builder</p>
            </div>
          </div>
          <button
            onClick={() => setIsScanModalOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleScan} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5 font-medium">
              Repository Directory Path (Local or Absolute)
            </label>
            <input
              type="text"
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              placeholder="e.g. backend or C:\Projects\MyRepo"
              className="w-full bg-command-950 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5 font-medium">
              Repository Name / Alias (Optional)
            </label>
            <input
              type="text"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              placeholder="e.g. OmniTrace-Core"
              className="w-full bg-command-950 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-neon-cyan"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono">
              {errorMsg}
            </div>
          )}

          <div className="pt-2 flex justify-end space-x-2.5">
            <button
              type="button"
              onClick={() => setIsScanModalOpen(false)}
              className="px-4 py-2 rounded-lg text-xs font-mono text-slate-400 hover:text-white border border-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-gradient-to-r from-neon-cyan to-neon-blue text-command-950 hover:brightness-110 flex items-center space-x-2 shadow-glow-cyan disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Parsing AST & Syncing Graph...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Scan & Ingest</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
