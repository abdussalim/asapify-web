import { ApiError, type Api, type ClusterDetail, type ClusterSummary, type Grid, type Meta, type PeatBoundary } from './types';
import { mockApi } from './mock/fixtures';

export const API_MODE: 'mock' | 'live' = import.meta.env.VITE_API_MODE === 'live' ? 'live' : 'mock';

const BASE = `${import.meta.env.VITE_API_BASE ?? ''}/api/v1`;

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(BASE + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!r.ok) {
    let code = `HTTP_${r.status}`;
    let message = r.statusText;
    try {
      const b = await r.json();
      code = b.error?.code ?? code;
      message = b.error?.message ?? message;
    } catch { /* badan bukan JSON */ }
    throw new ApiError(r.status, code, message);
  }
  return r.json() as Promise<T>;
}

const enc = encodeURIComponent;

const liveApi: Api = {
  meta: () => req<Meta>('/meta'),
  grid: (asOf) => req<Grid>(`/operator/grid${asOf ? `?as_of=${enc(asOf)}` : ''}`),
  clusters: () => req<ClusterSummary[]>('/operator/clusters?state=active'),
  cluster: (id) => req<ClusterDetail>(`/operator/clusters/${enc(id)}`),
  decide: async (id, body) => {
    await req(`/operator/clusters/${enc(id)}/decision`, { method: 'POST', body: JSON.stringify(body) });
  },
  peatBoundary: async () => {
    const url = import.meta.env.VITE_PEAT_LAYER_URL;
    if (!url) return { type: 'FeatureCollection', features: [] };
    const r = await fetch(url);
    return (await r.json()) as PeatBoundary;
  },
};

export const api: Api = API_MODE === 'live' ? liveApi : mockApi;
