const API_BASE = '/api/v1';

export async function fetchGraph() {
  const res = await fetch(`${API_BASE}/repos/graph`);
  if (!res.ok) throw new Error(`Failed to fetch graph: ${res.statusText}`);
  return res.json();
}

export async function fetchRepoStats() {
  const res = await fetch(`${API_BASE}/repos/stats`);
  if (!res.ok) throw new Error(`Failed to fetch stats: ${res.statusText}`);
  return res.json();
}

export async function analyzeRepository(repoPath: string, repoName?: string) {
  const res = await fetch(`${API_BASE}/repos/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo_path: repoPath, repo_name: repoName }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Analysis failed');
  }
  return res.json();
}

export async function ingestGithub(githubUrl: string, repoName?: string) {
  const res = await fetch(`${API_BASE}/ingest/github`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ github_url: githubUrl, repo_name: repoName }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'GitHub ingestion failed');
  }
  return res.json();
}

export async function ingestZip(file: File, repoName?: string) {
  const formData = new FormData();
  formData.append('file', file);
  if (repoName) {
    formData.append('repo_name', repoName);
  }

  const res = await fetch(`${API_BASE}/ingest/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'ZIP ingestion failed');
  }
  return res.json();
}

export async function calculateBlastRadius(targetId: string, maxDepth: number = 4) {
  const res = await fetch(`${API_BASE}/analysis/blast-radius`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_id: targetId, max_depth: maxDepth }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Blast radius calculation failed');
  }
  return res.json();
}

export async function fetchImpactMatrix() {
  const res = await fetch(`${API_BASE}/analysis/impact-matrix`);
  if (!res.ok) throw new Error('Failed to fetch impact matrix');
  return res.json();
}

export async function summarizeDiff(filePath: string, diffContent: string) {
  const res = await fetch(`${API_BASE}/ai/summarize-diff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_path: filePath, diff_content: diffContent }),
  });
  if (!res.ok) throw new Error('AI diff summarization failed');
  return res.json();
}

export async function askCodeArchaeologist(query: string, contextNodeId?: string) {
  const res = await fetch(`${API_BASE}/chat/archaeologist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, context_node_id: contextNodeId }),
  });
  if (!res.ok) throw new Error('Archaeologist query failed');
  return res.json();
}

export async function simulateMutation(nodeId: string) {
  const res = await fetch(`${API_BASE}/repos/simulate-mutation?node_id=${encodeURIComponent(nodeId)}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Simulation failed');
  return res.json();
}
