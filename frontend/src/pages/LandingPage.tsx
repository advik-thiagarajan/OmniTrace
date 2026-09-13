import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Layers,
  Cpu,
  Flame,
  ArrowRight,
  Sparkles,
  GitBranch,
  ShieldCheck,
  Zap,
  Terminal,
  Compass,
  Boxes,
  Github,
  ChevronRight
} from 'lucide-react';
import { LandingConstellation } from '../components/canvas/LandingConstellation';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans relative overflow-x-hidden selection:bg-neon-cyan/20 selection:text-neon-cyan">
      {/* 3D Background Three.js Particle Constellation Canvas */}
      <LandingConstellation />

      {/* Cyber Grid & Ambient Glow Overlays */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(0,242,254,0.15),rgba(255,255,255,0))] pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] pointer-events-none z-0" />

      {/* Content Wrapper */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Top Glass Navigation Bar */}
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#030712]/70 border-b border-white/10 px-6 py-4 transition-all">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Logo */}
            <div
              onClick={() => navigate('/')}
              className="flex items-center space-x-3 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-neon-cyan via-neon-blue to-neon-purple flex items-center justify-center shadow-[0_0_20px_rgba(0,242,254,0.4)] group-hover:shadow-[0_0_30px_rgba(0,242,254,0.7)] transition-all transform group-hover:scale-105 duration-300">
                <Activity className="w-6 h-6 text-[#030712] font-black" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-lg tracking-wider uppercase bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                    OmniTrace
                  </span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 font-semibold tracking-wider">
                    v1.0-alpha
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono tracking-wide">
                  Code Lineage Engine
                </span>
              </div>
            </div>

            {/* Nav links */}
            <nav className="hidden md:flex items-center space-x-8 text-xs font-mono text-slate-300">
              <a href="#features" className="hover:text-neon-cyan transition-colors">
                Constellations
              </a>
              <a href="#ast-engine" className="hover:text-neon-cyan transition-colors">
                AST Parser
              </a>
              <a href="#blast-radius" className="hover:text-neon-cyan transition-colors">
                Blast Radius
              </a>
              <a href="#architecture" className="hover:text-neon-cyan transition-colors">
                Architecture
              </a>
            </nav>

            {/* Action CTA in Nav */}
            <div className="flex items-center space-x-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors hidden sm:flex items-center space-x-1 text-xs font-mono"
              >
                <Github className="w-4 h-4" />
              </a>
              <button
                onClick={handleGoToDashboard}
                className="relative group px-5 py-2.5 rounded-xl font-mono text-xs font-bold text-[#030712] bg-gradient-to-r from-neon-cyan via-[#4facfe] to-neon-purple shadow-[0_0_20px_rgba(0,242,254,0.35)] hover:shadow-[0_0_30px_rgba(0,242,254,0.6)] hover:brightness-110 active:scale-95 transition-all flex items-center space-x-2"
              >
                <span>Dashboard</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-16 pb-24 max-w-5xl mx-auto">
          {/* Cyber Status Chip */}
          <div className="inline-flex items-center space-x-2.5 px-4 py-1.5 rounded-full bg-command-900/80 border border-neon-cyan/30 text-neon-cyan text-xs font-mono mb-8 backdrop-blur-md shadow-[0_0_15px_rgba(0,242,254,0.15)] animate-pulse">
            <span className="w-2 h-2 rounded-full bg-neon-cyan shadow-[0_0_8px_#00f2fe]" />
            <span className="font-semibold tracking-wide uppercase">
              Tree-sitter AST & Multi-Dimensional Lineage Graph
            </span>
          </div>

          {/* Impactful Hero Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white max-w-4xl leading-[1.1] mb-6">
            Enterprise-grade, distributed code lineage and real-time{' '}
            <span className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple bg-clip-text text-transparent underline decoration-neon-cyan/40 underline-offset-8">
              semantic impact analysis
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl text-slate-300 font-normal max-w-2xl leading-relaxed mb-10">
            Navigate complex codebases through interactive 3D spatial constellations. Simulate structural blast radiuses, trace cross-module symbol lineages, and diagnose architectural risk in real-time.
          </p>

          {/* Primary CTA Button (Prominent Glowing "Dashboard" Button) */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-16">
            <button
              onClick={handleGoToDashboard}
              className="w-full sm:w-auto relative group overflow-hidden px-10 py-4 rounded-2xl font-mono text-sm font-bold text-[#030712] bg-gradient-to-r from-neon-cyan via-[#38bdf8] to-neon-blue shadow-[0_0_35px_rgba(0,242,254,0.5)] hover:shadow-[0_0_55px_rgba(0,242,254,0.8)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center space-x-3 cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-[#030712] animate-spin-slow" />
              <span className="tracking-wider uppercase text-base">Dashboard</span>
              <ArrowRight className="w-5 h-5 text-[#030712] transform group-hover:translate-x-1.5 transition-transform" />
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
            </button>

            <a
              href="#features"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-mono text-sm font-semibold text-slate-200 bg-command-900/80 hover:bg-command-800 border border-white/15 hover:border-neon-cyan/40 hover:text-neon-cyan transition-all backdrop-blur-md flex items-center justify-center space-x-2"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Features</span>
            </a>
          </div>

          {/* Key Metrics / Highlights Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl text-left font-mono">
            {[
              { label: 'AST Parse Speed', value: '< 5ms', icon: Zap, color: 'text-neon-cyan' },
              { label: 'Lineage Accuracy', value: '100% AST', icon: ShieldCheck, color: 'text-emerald-400' },
              { label: 'Visualization', value: '3D WebGL', icon: Boxes, color: 'text-neon-blue' },
              { label: 'Blast Calculation', value: 'Multi-Hop', icon: Flame, color: 'text-neon-magenta' },
            ].map((stat, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-command-900/60 border border-white/10 backdrop-blur-md hover:border-white/20 transition-all group"
              >
                <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
                  <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                  <span>{stat.label}</span>
                </div>
                <div className="text-lg font-bold text-white tracking-wide group-hover:text-neon-cyan transition-colors">
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Value Proposition Feature Cards Section */}
        <section id="features" className="py-20 px-6 max-w-7xl mx-auto w-full relative z-10">
          <div className="text-center mb-16">
            <div className="inline-block px-3 py-1 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan text-xs font-mono font-semibold uppercase tracking-wider mb-3">
              Core Capabilities
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Constructed for Complex Modern Codebases
            </h2>
            <p className="text-slate-400 text-sm sm:text-base font-normal max-w-xl mx-auto mt-2">
              Transform tangled dependency webs into intuitive, navigable 3D intelligence architectures.
            </p>
          </div>

          {/* 3 Core Value Prop Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: 3D Code Constellations */}
            <div className="group relative p-8 rounded-3xl bg-gradient-to-b from-command-900/90 to-command-950/90 border border-white/10 hover:border-neon-cyan/50 backdrop-blur-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,242,254,0.2)] flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center text-neon-cyan mb-6 shadow-[0_0_15px_rgba(0,242,254,0.2)] group-hover:scale-110 transition-transform">
                  <Layers className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 tracking-wide group-hover:text-neon-cyan transition-colors">
                  3D Code Constellations
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Interactive spatial graph canvas mapping repositories, modules, files, classes, and functions into immersive 3D orbits with customizable palettes and orbital camera damping.
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono text-neon-cyan">
                <span>WebGL & Three.js Canvas</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 2: Tree-sitter AST Parsing */}
            <div className="group relative p-8 rounded-3xl bg-gradient-to-b from-command-900/90 to-command-950/90 border border-white/10 hover:border-neon-blue/50 backdrop-blur-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(79,172,254,0.2)] flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-neon-blue/10 border border-neon-blue/30 flex items-center justify-center text-neon-blue mb-6 shadow-[0_0_15px_rgba(79,172,254,0.2)] group-hover:scale-110 transition-transform">
                  <Cpu className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 tracking-wide group-hover:text-neon-blue transition-colors">
                  Tree-sitter AST Parsing
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Deep multi-language semantic parser extracting exact call hierarchies, inheritance trees, import lineages, and cyclomatic complexity across Python, TypeScript, and JavaScript.
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono text-neon-blue">
                <span>Multi-Language AST Support</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 3: Predictive Blast Radius */}
            <div className="group relative p-8 rounded-3xl bg-gradient-to-b from-command-900/90 to-command-950/90 border border-white/10 hover:border-neon-magenta/50 backdrop-blur-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(244,63,94,0.2)] flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-neon-magenta/10 border border-neon-magenta/30 flex items-center justify-center text-neon-magenta mb-6 shadow-[0_0_15px_rgba(244,63,94,0.2)] group-hover:scale-110 transition-transform">
                  <Flame className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 tracking-wide group-hover:text-neon-magenta transition-colors">
                  Predictive Blast Radius
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Real-time algorithmic impact simulation evaluating upstream and downstream cascade effects, computing composite risk metrics before code changes reach production.
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono text-neon-magenta">
                <span>Recursive Shockwave Analysis</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </section>

        {/* Architecture & Live Stream Spotlight */}
        <section id="architecture" className="py-16 px-6 max-w-6xl mx-auto w-full relative z-10">
          <div className="p-8 sm:p-12 rounded-3xl bg-command-900/70 border border-white/15 backdrop-blur-xl relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-neon-purple/10 border border-neon-purple/30 text-neon-purple text-xs font-mono mb-4">
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>Real-Time WebSocket Sync</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-4">
                  High-Throughput Reactive Architecture
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  OmniTrace links high-speed AST indexing pipelines with real-time WebSockets to animate mutations, pulsing nodes, and graph mutations as they occur in live code sandboxes.
                </p>

                <div className="space-y-3 font-mono text-xs">
                  <div className="flex items-center space-x-3 text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-neon-cyan" />
                    <span>Instant Shallow Git Ingestion (Depth=1)</span>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-neon-blue" />
                    <span>Direct ZIP Archive & Local Directory Ingestion</span>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-neon-purple" />
                    <span>AI Code Archaeologist with Cypher-grade Lineage Queries</span>
                  </div>
                </div>
              </div>

              {/* Terminal Snippet Box */}
              <div className="rounded-2xl bg-command-950 border border-white/10 p-5 font-mono text-xs shadow-2xl space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-white/10 text-slate-400">
                  <div className="flex items-center space-x-2">
                    <Terminal className="w-4 h-4 text-neon-cyan" />
                    <span>omnitrace-engine.log</span>
                  </div>
                  <span className="text-[10px] text-emerald-400">STREAMING ACTIVE</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-300">
                  <p className="text-slate-500">// Initializing AST tree extraction</p>
                  <p className="text-neon-cyan">&gt; AST_SCAN: Parsed 248 nodes across repository</p>
                  <p className="text-neon-blue">&gt; LINEAGE: 512 directional edges linked</p>
                  <p className="text-neon-magenta">&gt; BLAST_SIM: Shockwave propagation depth=3 [OK]</p>
                  <p className="text-emerald-400">&gt; 3D_CONSTELLATION: WebGL scene rendered at 60 FPS</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 px-6 max-w-4xl mx-auto text-center relative z-10">
          <div className="p-10 rounded-3xl bg-gradient-to-r from-neon-cyan/10 via-neon-blue/10 to-neon-purple/10 border border-neon-cyan/30 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,242,254,0.15)]">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              Explore Your Codebase in 3D
            </h2>
            <p className="text-slate-300 text-sm sm:text-base max-w-lg mx-auto mb-8">
              Step into the decluttered fullscreen constellation canvas and examine your software architecture from an entirely new perspective.
            </p>
            <button
              onClick={handleGoToDashboard}
              className="inline-flex items-center space-x-3 px-10 py-4 rounded-2xl font-mono text-sm font-bold text-[#030712] bg-gradient-to-r from-neon-cyan to-neon-blue shadow-[0_0_35px_rgba(0,242,254,0.6)] hover:shadow-[0_0_55px_rgba(0,242,254,0.9)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
            >
              <span>Dashboard</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </section>

        {/* Cyber Footer */}
        <footer className="mt-auto border-t border-white/10 bg-command-950/80 backdrop-blur-md py-8 px-6 text-center text-xs font-mono text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2 text-slate-400">
              <Activity className="w-4 h-4 text-neon-cyan" />
              <span className="font-bold text-slate-200">OmniTrace Engine</span>
              <span>© {new Date().getFullYear()}</span>
            </div>
            <div className="flex items-center space-x-6 text-slate-400">
              <a href="#features" className="hover:text-slate-200 transition-colors">Features</a>
              <a href="#architecture" className="hover:text-slate-200 transition-colors">Architecture</a>
              <button onClick={handleGoToDashboard} className="hover:text-neon-cyan transition-colors">Dashboard</button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
