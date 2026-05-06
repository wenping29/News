const API_BASE = '/api';

export async function fetchPolicies({ country, source, category, q, page = 1, limit = 20 }) {
  const params = new URLSearchParams();
  if (country) params.set('country', country);
  if (source) params.set('source', source);
  if (category) params.set('category', category);
  if (q) params.set('q', q);
  params.set('page', page);
  params.set('limit', limit);

  const res = await fetch(`${API_BASE}/policies?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchSources() {
  const res = await fetch(`${API_BASE}/sources`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function triggerCollect() {
  const res = await fetch(`${API_BASE}/collect`, { method: 'POST' });
  return res.json();
}

export async function fetchToolOperations(toolId) {
  const res = await fetch(`${API_BASE}/tools/operations/${toolId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
