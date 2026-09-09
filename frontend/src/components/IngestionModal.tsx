import React, { useState, useRef } from 'react';
import {
  FolderGit2,
  Github,
  UploadCloud,
  FolderOpen,
  Loader2,
  Sparkles,
  X,
  AlertCircle,
  FileArchive,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { useOmniStore } from '../store/useOmniStore';
import { analyzeRepository, fetchGraph, ingestGithub, ingestZip } from '../services/api';

type TabType = 'github' | 'zip' | 'local';

export const IngestionModal: React.FC = () => {
  const { isScanModalOpen, setIsScanModalOpen, setGraphData, addLog } = useOmniStore();

  const [activeTab, setActiveTab] = useState<TabType>('github');
  
  // GitHub Tab State
  const [githubUrl, setGithubUrl] = useState('');
  const [githubRepoName, setGithubRepoName] = useState('');

  // ZIP Tab State
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipRepoName, setZipRepoName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local Directory Tab State
  const [localPath, setLocalPath] = useState('backend');
  const [localRepoName, setLocalRepoName] = useState('OmniTrace-Core');

  // Status & Progress State
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isScanModalOpen) return null;

  const resetForm = () => {
    setErrorMsg(null);
    setIsLoading(false);
    setStatusMessage('');
  };

  const handleClose = () => {
    if (!isLoading) {
      setIsScanModalOpen(false);
      resetForm();
    }
  };

  const handleGithubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMsg(null);
    setStatusMessage('Initiating shallow git clone (depth=1)...');

    try {
      const stepTimer1 = setTimeout(() => {
        setStatusMessage('Cloning repository into isolated container...');
      }, 1200);

      const stepTimer2 = setTimeout(() => {
        setStatusMessage('Parsing AST nodes & symbols via Tree-sitter...');
      }, 3500);

      const stepTimer3 = setTimeout(() => {
        setStatusMessage('Constructing 3D Constellation & dependency graph...');
      }, 5500);

      const res = await ingestGithub(githubUrl.trim(), githubRepoName.trim() || undefined);

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      setStatusMessage('Finalizing 3D visualization...');
      const graphRes = await fetchGraph();
      setGraphData(graphRes.repo_name, graphRes.nodes, graphRes.edges);

      addLog({
        type: 'GRAPH',
        message: `Successfully ingested GitHub repo '${res.repo_name}': ${res.files_scanned} files, ${res.functions_extracted} functions, ${res.edges_created} edges in ${res.duration_ms}ms`,
      });

      setIsScanModalOpen(false);
      resetForm();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to ingest GitHub repository');
    } finally {
      setIsLoading(false);
    }
  };

  const handleZipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zipFile || isLoading) return;

    setIsLoading(true);
    setErrorMsg(null);
    setStatusMessage('Uploading and extracting ZIP archive...');

    try {
      const stepTimer1 = setTimeout(() => {
        setStatusMessage('Extracting source files safely in sandbox...');
      }, 800);

      const stepTimer2 = setTimeout(() => {
        setStatusMessage('Parsing AST nodes via Tree-sitter...');
      }, 2500);

      const stepTimer3 = setTimeout(() => {
        setStatusMessage('Building 3D knowledge graph & edge lineages...');
      }, 4500);

      const res = await ingestZip(zipFile, zipRepoName.trim() || undefined);

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      setStatusMessage('Finalizing 3D visual constellation...');
      const graphRes = await fetchGraph();
      setGraphData(graphRes.repo_name, graphRes.nodes, graphRes.edges);

      addLog({
        type: 'GRAPH',
        message: `Successfully ingested uploaded archive '${res.repo_name}': ${res.files_scanned} files, ${res.functions_extracted} functions in ${res.duration_ms}ms`,
      });

      setIsScanModalOpen(false);
      resetForm();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to ingest ZIP archive');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localPath.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMsg(null);
    setStatusMessage('Scanning local codebase path...');

    try {
      const res = await analyzeRepository(localPath.trim(), localRepoName.trim() || undefined);
      const graphRes = await fetchGraph();
      setGraphData(graphRes.repo_name, graphRes.nodes, graphRes.edges);

      addLog({
        type: 'GRAPH',
        message: `Indexed local workspace '${res.repo_name}': ${res.files_scanned} files, ${res.edges_created} edges in ${res.duration_ms}ms`,
      });

      setIsScanModalOpen(false);
      resetForm();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to scan local repository');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.zip')) {
        setZipFile(file);
        if (!zipRepoName) {
          setZipRepoName(file.name.replace(/\.zip$/i, ''));
        }
      } else {
        setErrorMsg('Please upload a valid .zip archive file.');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.name.toLowerCase().endsWith('.zip')) {
        setZipFile(file);
        if (!zipRepoName) {
          setZipRepoName(file.name.replace(/\.zip$/i, ''));
        }
      } else {
        setErrorMsg('Please upload a valid .zip archive file.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-command-900 border border-white/15 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-command-950/90 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center text-neon-cyan shadow-glow-cyan">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Ingest Codebase</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Tree-sitter AST & Multi-Dimensional Graph Ingestion
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 bg-command-950/60 p-1 border-b border-white/10 text-xs font-mono">
          <button
            type="button"
            onClick={() => {
              if (!isLoading) {
                setActiveTab('github');
                setErrorMsg(null);
              }
            }}
            disabled={isLoading}
            className={`py-2 px-3 rounded-lg flex items-center justify-center space-x-2 transition-all ${
              activeTab === 'github'
                ? 'bg-command-800 text-neon-cyan border border-neon-cyan/30 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub URL</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isLoading) {
                setActiveTab('zip');
                setErrorMsg(null);
              }
            }}
            disabled={isLoading}
            className={`py-2 px-3 rounded-lg flex items-center justify-center space-x-2 transition-all ${
              activeTab === 'zip'
                ? 'bg-command-800 text-neon-blue border border-neon-blue/30 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload ZIP</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isLoading) {
                setActiveTab('local');
                setErrorMsg(null);
              }
            }}
            disabled={isLoading}
            className={`py-2 px-3 rounded-lg flex items-center justify-center space-x-2 transition-all ${
              activeTab === 'local'
                ? 'bg-command-800 text-neon-purple border border-neon-purple/30 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Local Path</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto">
          {/* GitHub Tab */}
          {activeTab === 'github' && (
            <form onSubmit={handleGithubSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5 font-medium flex items-center justify-between">
                  <span>Public GitHub Repository URL</span>
                  <span className="text-[10px] text-neon-cyan">Shallow clone depth=1</span>
                </label>
                <input
                  type="text"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/owner/repository"
                  disabled={isLoading}
                  className="w-full bg-command-950 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan disabled:opacity-50 transition-all"
                  required
                />
              </div>

              {/* Preset quick pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-mono text-slate-500">Quick Try:</span>
                {[
                  { name: 'Pallets/Flask', url: 'https://github.com/pallets/flask' },
                  { name: 'FastAPI', url: 'https://github.com/fastapi/fastapi' },
                  { name: 'Express.js', url: 'https://github.com/expressjs/express' },
                ].map((demo) => (
                  <button
                    key={demo.name}
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      setGithubUrl(demo.url);
                      setGithubRepoName(demo.name);
                    }}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 hover:border-neon-cyan/40 hover:text-neon-cyan text-slate-300 transition-colors"
                  >
                    {demo.name}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5 font-medium">
                  Repository Name / Alias <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={githubRepoName}
                  onChange={(e) => setGithubRepoName(e.target.value)}
                  placeholder="Auto-detected if left empty"
                  disabled={isLoading}
                  className="w-full bg-command-950 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-neon-cyan disabled:opacity-50"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-lg text-xs font-mono text-slate-400 hover:text-white border border-white/10 hover:bg-white/5 disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !githubUrl.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-gradient-to-r from-neon-cyan to-neon-blue text-command-950 hover:brightness-110 flex items-center space-x-2 shadow-glow-cyan disabled:opacity-50 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Cloning & Ingesting...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Clone & Analyze</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ZIP Tab */}
          {activeTab === 'zip' && (
            <form onSubmit={handleZipSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5 font-medium">
                  Source Code Archive (.zip)
                </label>
                
                {/* Drag and drop zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!isLoading) setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  onClick={() => !isLoading && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-neon-blue bg-neon-blue/10 scale-[0.99]'
                      : zipFile
                      ? 'border-neon-cyan/40 bg-command-950'
                      : 'border-white/15 hover:border-white/30 bg-command-950/50'
                  } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip,application/zip"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {zipFile ? (
                    <div className="flex flex-col items-center space-y-2 text-slate-200">
                      <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 border border-neon-cyan/40 flex items-center justify-center text-neon-cyan shadow-glow-cyan">
                        <FileArchive className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-mono font-medium">{zipFile.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {(zipFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to Ingest
                      </div>
                      <span className="text-[10px] text-neon-cyan underline pt-1">
                        Click or drag to replace archive
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-2 text-slate-400">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-mono text-slate-300">
                        Drag & drop your code <span className="text-neon-blue">.zip</span> archive here
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        Supports Python, TypeScript, JavaScript repositories
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5 font-medium">
                  Repository Name / Alias <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={zipRepoName}
                  onChange={(e) => setZipRepoName(e.target.value)}
                  placeholder="Defaults to archive name"
                  disabled={isLoading}
                  className="w-full bg-command-950 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-neon-blue disabled:opacity-50"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-lg text-xs font-mono text-slate-400 hover:text-white border border-white/10 hover:bg-white/5 disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !zipFile}
                  className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-gradient-to-r from-neon-blue to-neon-purple text-white hover:brightness-110 flex items-center space-x-2 shadow-glow-cyan disabled:opacity-50 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Extracting & Parsing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Upload & Ingest</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Local Path Tab */}
          {activeTab === 'local' && (
            <form onSubmit={handleLocalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5 font-medium">
                  Repository Directory Path (Local or Absolute)
                </label>
                <input
                  type="text"
                  value={localPath}
                  onChange={(e) => setLocalPath(e.target.value)}
                  placeholder="e.g. backend or C:\Projects\MyRepo"
                  disabled={isLoading}
                  className="w-full bg-command-950 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple disabled:opacity-50 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5 font-medium">
                  Repository Name / Alias <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={localRepoName}
                  onChange={(e) => setLocalRepoName(e.target.value)}
                  placeholder="e.g. OmniTrace-Core"
                  disabled={isLoading}
                  className="w-full bg-command-950 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-neon-purple disabled:opacity-50"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-lg text-xs font-mono text-slate-400 hover:text-white border border-white/10 hover:bg-white/5 disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !localPath.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-gradient-to-r from-neon-purple to-neon-cyan text-command-950 hover:brightness-110 flex items-center space-x-2 shadow-glow-cyan disabled:opacity-50 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Scanning AST...</span>
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
          )}

          {/* Loading status progress overlay/banner */}
          {isLoading && statusMessage && (
            <div className="mt-4 p-3.5 rounded-xl bg-command-950 border border-neon-cyan/30 text-xs font-mono flex items-center space-x-3 animate-pulse">
              <Loader2 className="w-4 h-4 text-neon-cyan animate-spin shrink-0" />
              <div className="text-slate-200 font-medium">{statusMessage}</div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMsg}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
