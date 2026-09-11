import { create } from 'zustand';

export interface GraphNode {
  id: string;
  label: string;
  name: string;
  type: 'REPOSITORY' | 'FILE' | 'FUNCTION' | 'CLASS' | 'MODULE';
  file_path?: string;
  language?: string;
  complexity?: number;
  fan_in?: number;
  fan_out?: number;
  risk_score?: number;
  position?: [number, number, number];
  properties?: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'CONTAINS' | 'CALLS' | 'IMPORTS' | 'MODIFIES' | 'INHERITS';
  weight?: number;
  properties?: Record<string, any>;
}

export interface ImpactedNode {
  node: GraphNode;
  depth: number;
  path_from_target: string[];
  relationship_types: string[];
  individual_risk: number;
  reason: string;
}

export interface BlastRadiusResult {
  target_node: GraphNode;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_breakdown: {
    fan_out_score: number;
    depth_penalty: number;
    complexity_weight: number;
    criticality_factor: number;
    composite_risk_score: number;
    risk_level: string;
  };
  total_impacted_nodes: number;
  impacted_nodes: ImpactedNode[];
  impacted_edges: GraphEdge[];
  recommended_mitigation: string[];
  generated_at: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'INFO' | 'MUTATION' | 'BLAST_RADIUS' | 'ALERT' | 'GRAPH';
  message: string;
  details?: any;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  citations?: {
    file_path: string;
    symbol_name?: string;
    line_start?: number;
    line_end?: number;
  }[];
  cypher_query?: string;
}

interface OmniState {
  // Graph State
  repoName: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  isLoadingGraph: boolean;

  // Selection & Hover
  selectedNode: GraphNode | null;
  hoveredNode: GraphNode | null;
  searchQuery: string;
  nodeTypeFilter: 'ALL' | 'FILE' | 'FUNCTION' | 'CLASS';

  // Blast Radius State
  blastRadiusResult: BlastRadiusResult | null;
  isCalculatingBlastRadius: boolean;
  impactedNodeIdSet: Set<string>;
  impactedEdgeIdSet: Set<string>;

  // Real-time & Visual Animations
  wsConnected: boolean;
  liveLogs: LogEntry[];
  pulsingNodeIds: Set<string>;
  activeStreamEdgeIds: Set<string>;
  cameraFocusPosition: [number, number, number] | null;

  // UI Panels
  activeTab: 'inspector' | 'blast' | 'archaeologist' | 'diff';
  isTerminalOpen: boolean;
  isScanModalOpen: boolean;

  // Chat
  chatMessages: ChatMessage[];
  isChatLoading: boolean;

  // Color Customization State
  nodeColor: string;
  edgeColor: string;
  highlightColor: string;

  // Actions
  setGraphData: (repoName: string, nodes: GraphNode[], edges: GraphEdge[]) => void;
  setSelectedNode: (node: GraphNode | null) => void;
  setHoveredNode: (node: GraphNode | null) => void;
  setSearchQuery: (query: string) => void;
  setNodeTypeFilter: (filter: 'ALL' | 'FILE' | 'FUNCTION' | 'CLASS') => void;
  setBlastRadiusResult: (result: BlastRadiusResult | null) => void;
  setIsCalculatingBlastRadius: (val: boolean) => void;
  setWsConnected: (connected: boolean) => void;
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'> & { timestamp?: string }) => void;
  triggerPulse: (nodeIds: string[]) => void;
  setActiveTab: (tab: 'inspector' | 'blast' | 'archaeologist' | 'diff') => void;
  toggleTerminal: () => void;
  setIsScanModalOpen: (open: boolean) => void;
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setIsChatLoading: (val: boolean) => void;
  setCameraFocusPosition: (pos: [number, number, number] | null) => void;
  setNodeColor: (color: string) => void;
  setEdgeColor: (color: string) => void;
  setHighlightColor: (color: string) => void;
  resetColors: () => void;
}

export const useOmniStore = create<OmniState>((set, get) => ({
  repoName: 'OmniTrace-Workspace',
  nodes: [],
  edges: [],
  isLoadingGraph: false,

  selectedNode: null,
  hoveredNode: null,
  searchQuery: '',
  nodeTypeFilter: 'ALL',

  blastRadiusResult: null,
  isCalculatingBlastRadius: false,
  impactedNodeIdSet: new Set(),
  impactedEdgeIdSet: new Set(),

  wsConnected: false,
  liveLogs: [],
  pulsingNodeIds: new Set(),
  activeStreamEdgeIds: new Set(),
  cameraFocusPosition: null,

  activeTab: 'inspector',
  isTerminalOpen: true,
  isScanModalOpen: false,

  chatMessages: [
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Greetings. I am the OmniTrace Code Archaeologist. Ask me anything about symbol lineages, dependency chains, or structural blast radiuses across the codebase.',
      timestamp: new Date().toLocaleTimeString(),
    },
  ],
  isChatLoading: false,

  nodeColor: '#3b82f6',
  edgeColor: '#64748b',
  highlightColor: '#ef4444',

  setGraphData: (repoName, nodes, edges) => set({ repoName, nodes, edges, isLoadingGraph: false }),
  
  setSelectedNode: (node) => {
    set({ selectedNode: node });
    if (node && node.position) {
      set({ cameraFocusPosition: node.position });
    }
  },

  setHoveredNode: (node) => set({ hoveredNode: node }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setNodeTypeFilter: (filter) => set({ nodeTypeFilter: filter }),

  setBlastRadiusResult: (result) => {
    if (!result) {
      set({
        blastRadiusResult: null,
        impactedNodeIdSet: new Set(),
        impactedEdgeIdSet: new Set(),
      });
      return;
    }
    const nodeSet = new Set<string>();
    nodeSet.add(result.target_node.id);
    result.impacted_nodes.forEach((n) => nodeSet.add(n.node.id));

    const edgeSet = new Set<string>();
    result.impacted_edges.forEach((e) => edgeSet.add(e.id));

    set({
      blastRadiusResult: result,
      impactedNodeIdSet: nodeSet,
      impactedEdgeIdSet: edgeSet,
      activeTab: 'blast',
    });
  },

  setIsCalculatingBlastRadius: (val) => set({ isCalculatingBlastRadius: val }),
  setWsConnected: (connected) => set({ wsConnected: connected }),

  addLog: (log) =>
    set((state) => ({
      liveLogs: [
        {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toLocaleTimeString(),
          ...log,
        },
        ...state.liveLogs.slice(0, 99), // Keep latest 100 entries
      ],
    })),

  triggerPulse: (nodeIds) => {
    const newSet = new Set(nodeIds);
    set({ pulsingNodeIds: newSet });
    setTimeout(() => {
      set({ pulsingNodeIds: new Set() });
    }, 2500);
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleTerminal: () => set((state) => ({ isTerminalOpen: !state.isTerminalOpen })),
  setIsScanModalOpen: (open) => set({ isScanModalOpen: open }),

  addChatMessage: (msg) =>
    set((state) => ({
      chatMessages: [
        ...state.chatMessages,
        {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toLocaleTimeString(),
          ...msg,
        },
      ],
    })),

  setIsChatLoading: (val) => set({ isChatLoading: val }),
  setCameraFocusPosition: (pos) => set({ cameraFocusPosition: pos }),
  setNodeColor: (color) => set({ nodeColor: color }),
  setEdgeColor: (color) => set({ edgeColor: color }),
  setHighlightColor: (color) => set({ highlightColor: color }),
  resetColors: () => set({ nodeColor: '#3b82f6', edgeColor: '#64748b', highlightColor: '#ef4444' }),
}));
