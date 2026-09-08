from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# --- Enums ---
class NodeType(str, Enum):
    REPOSITORY = "REPOSITORY"
    FILE = "FILE"
    FUNCTION = "FUNCTION"
    CLASS = "CLASS"
    MODULE = "MODULE"


class EdgeType(str, Enum):
    CONTAINS = "CONTAINS"
    CALLS = "CALLS"
    IMPORTS = "IMPORTS"
    MODIFIES = "MODIFIES"
    INHERITS = "INHERITS"


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Language(str, Enum):
    PYTHON = "python"
    TYPESCRIPT = "typescript"
    JAVASCRIPT = "javascript"
    UNKNOWN = "unknown"


# --- AST Parser Models ---
class SymbolLocation(BaseModel):
    start_line: int
    start_column: int
    end_line: int
    end_column: int


class FunctionSymbol(BaseModel):
    name: str
    qualified_name: str
    file_path: str
    location: SymbolLocation
    parameters: List[str] = Field(default_factory=list)
    docstring: Optional[str] = None
    is_async: bool = False
    is_method: bool = False
    parent_class: Optional[str] = None
    cyclomatic_complexity: int = 1
    calls: List[str] = Field(default_factory=list)  # list of called function names / signatures


class ClassSymbol(BaseModel):
    name: str
    qualified_name: str
    file_path: str
    location: SymbolLocation
    base_classes: List[str] = Field(default_factory=list)
    methods: List[FunctionSymbol] = Field(default_factory=list)
    docstring: Optional[str] = None


class ImportSymbol(BaseModel):
    module_name: str
    imported_names: List[str] = Field(default_factory=list)
    alias: Optional[str] = None
    is_relative: bool = False
    file_path: str
    location: SymbolLocation


class CallSymbol(BaseModel):
    caller_qualified_name: str
    callee_name: str
    file_path: str
    location: SymbolLocation
    arguments_count: int = 0


class ParsedFile(BaseModel):
    file_path: str
    relative_path: str
    language: Language
    size_bytes: int
    total_lines: int
    functions: List[FunctionSymbol] = Field(default_factory=list)
    classes: List[ClassSymbol] = Field(default_factory=list)
    imports: List[ImportSymbol] = Field(default_factory=list)
    calls: List[CallSymbol] = Field(default_factory=list)
    syntax_valid: bool = True
    parse_errors: List[str] = Field(default_factory=list)


# --- Graph DTO Models for 3D Visualizer ---
class GraphNode(BaseModel):
    id: str
    label: str
    name: str
    type: NodeType
    file_path: Optional[str] = None
    language: Optional[str] = None
    complexity: Optional[int] = 1
    fan_in: Optional[int] = 0
    fan_out: Optional[int] = 0
    risk_score: Optional[float] = 0.0
    properties: Dict[str, Any] = Field(default_factory=dict)
    # 3D spatial position (can be pre-computed or generated)
    position: Optional[List[float]] = None


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    type: EdgeType
    weight: float = 1.0
    properties: Dict[str, Any] = Field(default_factory=dict)


class GraphDataResponse(BaseModel):
    repo_name: str
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    total_nodes: int
    total_edges: int
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# --- Repository Ingestion Models ---
class RepoIngestRequest(BaseModel):
    repo_path: str = Field(..., description="Absolute or relative local directory path")
    repo_name: Optional[str] = Field(None, description="Custom repository alias")
    include_patterns: Optional[List[str]] = Field(default=["*.py", "*.ts", "*.tsx", "*.js", "*.jsx"])
    exclude_patterns: Optional[List[str]] = Field(
        default=["node_modules", ".venv", "venv", ".git", "dist", "build", "__pycache__", ".next"]
    )


class RepoIngestResponse(BaseModel):
    status: str
    repo_name: str
    repo_path: str
    files_scanned: int
    functions_extracted: int
    classes_extracted: int
    edges_created: int
    duration_ms: float
    message: str


class RepoSummary(BaseModel):
    name: str
    path: str
    total_files: int
    total_functions: int
    total_classes: int
    total_dependencies: int
    languages: Dict[str, int]
    avg_complexity: float


# --- Blast Radius & Predictive Risk Models ---
class BlastRadiusRequest(BaseModel):
    target_id: str = Field(..., description="Node ID or File Path or Function qualified name")
    max_depth: int = Field(default=4, ge=1, le=10)
    change_type: Optional[str] = Field(default="MODIFIED", description="ADDED, MODIFIED, DELETED, SIGNATURE_CHANGE")


class ImpactedNode(BaseModel):
    node: GraphNode
    depth: int
    path_from_target: List[str]
    relationship_types: List[str]
    individual_risk: float
    reason: str


class RiskBreakdown(BaseModel):
    fan_out_score: float
    depth_penalty: float
    complexity_weight: float
    criticality_factor: float
    composite_risk_score: float  # 0 to 100
    risk_level: RiskLevel


class BlastRadiusResponse(BaseModel):
    target_node: GraphNode
    risk_score: float
    risk_level: RiskLevel
    risk_breakdown: RiskBreakdown
    total_impacted_nodes: int
    impacted_nodes: List[ImpactedNode]
    impacted_edges: List[GraphEdge]
    recommended_mitigation: List[str]
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# --- Ollama AI Models ---
class DiffSummaryRequest(BaseModel):
    file_path: str
    diff_content: str
    target_symbol: Optional[str] = None


class DiffSummaryResponse(BaseModel):
    file_path: str
    summary_markdown: str
    breaking_change_detected: bool
    affected_behaviors: List[str]
    model_used: str
    latency_ms: float


class NodeExplanationRequest(BaseModel):
    node_id: str
    include_dependencies: bool = True


class NodeExplanationResponse(BaseModel):
    node_id: str
    title: str
    explanation: str
    semantic_role: str
    upstream_dependencies: List[str]
    downstream_dependents: List[str]


# --- Natural Language Code Archaeologist Models ---
class ArchaeologistChatRequest(BaseModel):
    query: str
    context_node_id: Optional[str] = None
    repo_name: Optional[str] = None
    chat_history: Optional[List[Dict[str, str]]] = Field(default_factory=list)


class SourceCitation(BaseModel):
    file_path: str
    symbol_name: Optional[str] = None
    line_start: Optional[int] = None
    line_end: Optional[int] = None
    snippet: Optional[str] = None


class ArchaeologistChatResponse(BaseModel):
    answer: str
    citations: List[SourceCitation] = Field(default_factory=list)
    cypher_query_used: Optional[str] = None
    referenced_node_ids: List[str] = Field(default_factory=list)
    model: str


# --- WebSocket Messages ---
class WebSocketEventType(str, Enum):
    CONNECTED = "CONNECTED"
    FILE_MUTATED = "FILE_MUTATED"
    GRAPH_UPDATED = "GRAPH_UPDATED"
    BLAST_RADIUS_ALERT = "BLAST_RADIUS_ALERT"
    SIMULATION_EVENT = "SIMULATION_EVENT"
    HEARTBEAT = "HEARTBEAT"
    ERROR = "ERROR"


class WebSocketMessage(BaseModel):
    event: WebSocketEventType
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    payload: Dict[str, Any] = Field(default_factory=dict)
