import React, { useState } from 'react';
import { Palette, ChevronDown, ChevronUp, RotateCcw, Sparkles, Check } from 'lucide-react';
import { useGraphStore } from '../store/useGraphStore';

interface PresetTheme {
  name: string;
  nodeColor: string;
  edgeColor: string;
  highlightColor: string;
}

const PRESET_THEMES: PresetTheme[] = [
  {
    name: 'Cobalt Standard',
    nodeColor: '#3b82f6',
    edgeColor: '#64748b',
    highlightColor: '#ef4444',
  },
  {
    name: 'Cyberpunk Neon',
    nodeColor: '#00f2fe',
    edgeColor: '#818cf8',
    highlightColor: '#ff0055',
  },
  {
    name: 'Emerald Matrix',
    nodeColor: '#10b981',
    edgeColor: '#475569',
    highlightColor: '#f43f5e',
  },
  {
    name: 'Solar Flare',
    nodeColor: '#f59e0b',
    edgeColor: '#71717a',
    highlightColor: '#dc2626',
  },
  {
    name: 'Synthwave Glow',
    nodeColor: '#d946ef',
    edgeColor: '#38bdf8',
    highlightColor: '#fb7185',
  },
];

const SWATCH_OPTIONS = [
  '#3b82f6', // Blue
  '#00f2fe', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#d946ef', // Fuchsia
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#64748b', // Slate
  '#ffffff', // White
];

export const ColorCustomizer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    nodeColor,
    edgeColor,
    highlightColor,
    setNodeColor,
    setEdgeColor,
    setHighlightColor,
    resetColors,
  } = useGraphStore();

  const applyTheme = (theme: PresetTheme) => {
    setNodeColor(theme.nodeColor);
    setEdgeColor(theme.edgeColor);
    setHighlightColor(theme.highlightColor);
  };

  return (
    <div className="absolute top-4 right-4 z-30 select-none">
      <div className="flex flex-col items-end">
        {/* Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-command-950/85 backdrop-blur-xl border border-white/10 hover:border-cyan-500/50 text-slate-200 hover:text-white shadow-2xl transition-all duration-200 group cursor-pointer"
          title="Toggle Canvas Color Customizer"
        >
          <div className="relative">
            <Palette className="w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform duration-200" />
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-command-950"
              style={{ backgroundColor: nodeColor }}
            />
          </div>
          <span className="text-xs font-mono font-medium tracking-wide">Palette</span>
          {isOpen ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200" />
          )}
        </button>

        {/* Collapsible Panel */}
        {isOpen && (
          <div className="mt-2 w-80 rounded-2xl bg-command-950/90 backdrop-blur-2xl border border-white/15 shadow-2xl p-4 text-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <Palette className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-200 font-mono">
                  Canvas Customizer
                </span>
              </div>
              <button
                onClick={resetColors}
                className="flex items-center space-x-1 text-[11px] font-mono text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                title="Reset all colors to default"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Color Controls */}
            <div className="mt-3.5 space-y-3.5">
              {/* Node Color Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-300 font-medium">Node Color</span>
                  <span className="text-slate-400 uppercase">{nodeColor}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-white/20 shadow-inner flex-shrink-0 cursor-pointer">
                    <input
                      type="color"
                      value={nodeColor}
                      onChange={(e) => setNodeColor(e.target.value)}
                      className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer opacity-0"
                      aria-label="Pick Node Color"
                    />
                    <div
                      className="w-full h-full"
                      style={{ backgroundColor: nodeColor }}
                    />
                  </div>
                  <input
                    type="text"
                    value={nodeColor}
                    onChange={(e) => setNodeColor(e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs font-mono bg-command-900/90 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors uppercase"
                    maxLength={7}
                    placeholder="#3b82f6"
                  />
                </div>
                {/* Node Swatches */}
                <div className="flex items-center space-x-1.5 pt-1">
                  {SWATCH_OPTIONS.map((swatch) => (
                    <button
                      key={`node-${swatch}`}
                      onClick={() => setNodeColor(swatch)}
                      style={{ backgroundColor: swatch }}
                      className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                        nodeColor.toLowerCase() === swatch.toLowerCase()
                          ? 'ring-2 ring-cyan-400 scale-110'
                          : 'opacity-70 hover:opacity-100 hover:scale-110'
                      }`}
                      title={swatch}
                    />
                  ))}
                </div>
              </div>

              {/* Edge Color Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-300 font-medium">Edge Color</span>
                  <span className="text-slate-400 uppercase">{edgeColor}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-white/20 shadow-inner flex-shrink-0 cursor-pointer">
                    <input
                      type="color"
                      value={edgeColor}
                      onChange={(e) => setEdgeColor(e.target.value)}
                      className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer opacity-0"
                      aria-label="Pick Edge Color"
                    />
                    <div
                      className="w-full h-full"
                      style={{ backgroundColor: edgeColor }}
                    />
                  </div>
                  <input
                    type="text"
                    value={edgeColor}
                    onChange={(e) => setEdgeColor(e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs font-mono bg-command-900/90 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors uppercase"
                    maxLength={7}
                    placeholder="#64748b"
                  />
                </div>
                {/* Edge Swatches */}
                <div className="flex items-center space-x-1.5 pt-1">
                  {SWATCH_OPTIONS.map((swatch) => (
                    <button
                      key={`edge-${swatch}`}
                      onClick={() => setEdgeColor(swatch)}
                      style={{ backgroundColor: swatch }}
                      className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                        edgeColor.toLowerCase() === swatch.toLowerCase()
                          ? 'ring-2 ring-cyan-400 scale-110'
                          : 'opacity-70 hover:opacity-100 hover:scale-110'
                      }`}
                      title={swatch}
                    />
                  ))}
                </div>
              </div>

              {/* Highlight / Alert Color Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-300 font-medium">Risk / Highlight</span>
                  <span className="text-slate-400 uppercase">{highlightColor}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-white/20 shadow-inner flex-shrink-0 cursor-pointer">
                    <input
                      type="color"
                      value={highlightColor}
                      onChange={(e) => setHighlightColor(e.target.value)}
                      className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer opacity-0"
                      aria-label="Pick Highlight Color"
                    />
                    <div
                      className="w-full h-full"
                      style={{ backgroundColor: highlightColor }}
                    />
                  </div>
                  <input
                    type="text"
                    value={highlightColor}
                    onChange={(e) => setHighlightColor(e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs font-mono bg-command-900/90 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors uppercase"
                    maxLength={7}
                    placeholder="#ef4444"
                  />
                </div>
              </div>
            </div>

            {/* Quick Themes */}
            <div className="mt-4 pt-3 border-t border-white/10">
              <div className="flex items-center space-x-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                  Theme Presets
                </span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {PRESET_THEMES.map((theme) => {
                  const isActive =
                    nodeColor.toLowerCase() === theme.nodeColor.toLowerCase() &&
                    edgeColor.toLowerCase() === theme.edgeColor.toLowerCase() &&
                    highlightColor.toLowerCase() === theme.highlightColor.toLowerCase();

                  return (
                    <button
                      key={theme.name}
                      onClick={() => applyTheme(theme)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left text-xs font-mono transition-all duration-150 cursor-pointer ${
                        isActive
                          ? 'bg-white/10 border-cyan-500/50 text-white'
                          : 'bg-command-900/40 border-white/5 text-slate-300 hover:bg-white/5 hover:border-white/10'
                      }`}
                    >
                      <span className="truncate text-[11px]">{theme.name}</span>
                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: theme.nodeColor }}
                          title="Node Color"
                        />
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: theme.edgeColor }}
                          title="Edge Color"
                        />
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: theme.highlightColor }}
                          title="Highlight Color"
                        />
                        {isActive && <Check className="w-3 h-3 text-cyan-400 ml-1" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
