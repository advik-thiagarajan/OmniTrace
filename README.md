# OmniTrace 🪐
### Enterprise Distributed Code Lineage & Real-Time Semantic Impact Analysis Platform

[![CI/CD Pipeline](https://github.com/advik-thiagarajan/OmniTrace/actions/workflows/ci.yml/badge.svg)](https://github.com/advik-thiagarajan/OmniTrace/actions)
[![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-R3F-black.svg)](https://threejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🌟 Overview

**OmniTrace** is an enterprise-grade static analysis, architectural lineage, and predictive blast-radius platform. It transforms raw source code into an interactive 3D dependency universe, pairing deep AST graph extraction with local AI intelligence to forecast downstream risks before pull requests are even opened.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              OMNITRACE ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────────────┘
  Source Files (.py, .ts, .tsx, .js)
        │
        ▼
  [Tree-sitter AST Parsing Engine]
        │
        ├── Extract Functions, Classes, Imports, Calls, Complexity
        ▼
  [Knowledge Graph Service (Neo4j / In-Memory Dual Engine)]
        │
        ├── CONTAINS, CALLS, IMPORTS, INHERITS Lineage Edges
        ▼
  ┌───────────────────────────────┬───────────────────────────────┐
  │                               │                               │
  ▼                               ▼                               ▼
[Predictive Blast Radius]     [Local AI Ollama Client]   [Real-Time WebSocket Streamer]
  • Multi-Hop Traversal (1-4)   • Semantic Diff Summaries  • Watchdog File Mutation Hooks
  • Composite Risk (0-100)      • Code Archaeologist (RAG) • Live 3D Particle & Pulse Events
  │                               │                               │
  └───────────────────────────────┼───────────────────────────────┘
                                  │
                                  ▼
           [3D Constellation Visualizer (Three.js & R3F)]
             • Spatial Spheres, Glow Shaders, Orbit Controls
             • Shockwave Halo Risk Rings, Particle Data Flow
```

---

## ✨ Key Features

1. **Tree-Sitter Multi-Language AST Engine**:
   - Parses Python (`.py`), TypeScript (`.ts`, `.tsx`), and JavaScript (`.js`, `.jsx`).
   - Extracts symbol hierarchies: files, classes, methods, functions, invocations, and cyclomatic complexity.

2. **Dual-Mode Graph Database Architecture**:
   - Native async Neo4j driver with Cypher constraints and indexes.
   - Built-in high-performance In-Memory Graph engine with automatic fallback for zero-dependency standalone execution.

3. **Predictive Blast Radius & Risk Scoring Algorithm**:
   - Multi-hop downstream topological traversal (1–4 hops).
   - Dynamic 0–100 composite risk scoring combining fan-out, cascading depth decay, cyclomatic weight, and entrypoint criticality.
   - Actionable automated mitigation recommendations.

4. **Local LLM via Ollama & GraphRAG Code Archaeologist**:
   - Instant markdown semantic diff narratives detecting breaking signature changes.
   - Natural language Code Archaeologist assistant answering architectural queries with file and line citations.

5. **Real-Time WebSocket Event Streamer & File Watcher**:
   - Background file mutation observer broadcasting live AST reparsing events.
   - Instant shockwave and pulse animations in the frontend.

6. **Interactive 3D Constellation Visualizer**:
   - Built on React Three Fiber (R3F), Three.js, Tailwind CSS, and Zustand.
   - Glowing 3D node spheres, animated particle flow streams along call paths, camera transitions, and dark-mode command center UI.

---

## 🚀 Quickstart Guide

### Prerequisites
- **Python 3.10+**
- **Node.js 18+ & npm**
- *(Optional)* **Ollama** running locally (`ollama run llama3`)
- *(Optional)* **Neo4j** instance running on bolt://localhost:7687

---

### 1. Backend Setup

```bash
# Clone the repository
git clone https://github.com/advik-thiagarajan/OmniTrace.git
cd OmniTrace

# Create and activate virtual environment
python -m venv .venv
# On Windows:
.\.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Start FastAPI server
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
The API and Swagger docs will be live at: `http://localhost:8000/docs`

---

### 2. Frontend Setup

```bash
cd frontend

# Install npm dependencies
npm install --legacy-peer-deps

# Start Vite dev server
npm run dev
```
Open your browser at: `http://localhost:5173`

---

## 🧪 Testing Suite

OmniTrace includes comprehensive automated tests covering AST parsing, graph traversal, risk algorithms, and API endpoints:

```bash
# Run pytest test suite
pytest backend/tests -v

# Run frontend production build test
cd frontend && npm run build
```

---

## 📡 API Reference Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/repos/analyze` | Scans local codebase, parses AST symbols, and constructs graph |
| `GET` | `/api/v1/repos/graph` | Returns 3D constellation node coordinates and edge lineages |
| `GET` | `/api/v1/repos/stats` | Returns module count, language breakdown, and average complexity |
| `POST` | `/api/v1/analysis/blast-radius` | Evaluates downstream cascading impact and 0-100 risk score |
| `POST` | `/api/v1/ai/summarize-diff` | Generates semantic diff summary via Ollama |
| `POST` | `/api/v1/chat/archaeologist` | Natural language GraphRAG architectural query assistant |
| `WS` | `/ws/live-stream` | Persistent WebSocket for real-time mutation and risk broadcasts |

---

## 👥 Authors & Maintainers

- **Advik Thiagarajan** ([@advik-thiagarajan](https://github.com/advik-thiagarajan))
- Developed for enterprise code lineage & semantic impact analysis.
