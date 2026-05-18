import type { ProcessResponse, Topology } from '../types';

const API_BASE = '/api';

export async function fetchTopology(): Promise<Topology> {
  const res = await fetch(`${API_BASE}/topology`);
  if (!res.ok) throw new Error(`/api/topology failed: ${res.status}`);
  return res.json();
}

export async function fetchProcessesForTarget(targetId: string): Promise<ProcessResponse> {
  const res = await fetch(`${API_BASE}/cluster-processes?target=${encodeURIComponent(targetId)}`);
  if (!res.ok) throw new Error(`/api/cluster-processes failed: ${res.status}`);
  return res.json();
}

export async function killQuery(queryId: string, targetId: string): Promise<{ status: string | false }> {
  const res = await fetch(
    `${API_BASE}/kill-query/${encodeURIComponent(queryId)}?target=${encodeURIComponent(targetId)}`,
    { method: 'DELETE' },
  );
  return res.json();
}

export async function wakeTarget(targetId: string): Promise<{ status: string | false; error?: string }> {
  const res = await fetch(`${API_BASE}/targets/${encodeURIComponent(targetId)}/wake`, { method: 'POST' });
  return res.json();
}
