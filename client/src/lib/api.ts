import type { AnalysisRecord, AnalysisSummary } from './types';

// Empty base -> calls "/api/..." on the same origin. In dev, Vite proxies that
// to the backend (see vite.config.ts). In prod, set VITE_API_URL if the API
// lives elsewhere.
const BASE = import.meta.env.VITE_API_URL ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      if (body.error?.message) message = body.error.message;
    } catch {
      // Response had no JSON body; keep the generic message.
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export interface CreateAnalysisInput {
  rawLog: string;
  source?: 'paste' | 'upload';
  fileName?: string;
}

export const api = {
  createAnalysis: (input: CreateAnalysisInput, signal?: AbortSignal) =>
    request<AnalysisRecord>('/api/analyses', {
      method: 'POST',
      body: JSON.stringify(input),
      signal,
    }),
  listAnalyses: () => request<AnalysisSummary[]>('/api/analyses'),
  getAnalysis: (id: string) => request<AnalysisRecord>(`/api/analyses/${id}`),
};
