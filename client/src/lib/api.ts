import type { AnalysisRecord, AnalysisSummary, SharedAnalysis } from './types';
import { detectLanguage } from '../i18n/languages';
import { RequestError } from './requestError';
import { getVisitorId } from './visitor';

// Empty base -> calls "/api/..." on the same origin. In dev, Vite proxies that
// to the backend (see vite.config.ts). In prod, set VITE_API_URL if the API
// lives elsewhere.
const BASE = import.meta.env.VITE_API_URL ?? '';

/** The message the server sent, or an empty string when the response has no JSON body. */
async function serverMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body.error?.message ?? '';
  } catch {
    return '';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Visitor-Id': getVisitorId(),
      'X-Language': detectLanguage(),
    },
    ...init,
  });

  if (!response.ok) {
    throw new RequestError(response.status, await serverMessage(response));
  }

  return response.json() as Promise<T>;
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
  deleteAnalyses: () => request<{ deleted: number }>('/api/analyses', { method: 'DELETE' }),
  getAnalysis: (id: string) => request<AnalysisRecord>(`/api/analyses/${id}`),
  setFeedback: (id: string, helpful: boolean | null) =>
    request<{ helpful: boolean | null }>(`/api/analyses/${id}/feedback`, {
      method: 'PUT',
      body: JSON.stringify({ helpful }),
    }),
  createShare: (id: string) =>
    request<{ shareToken: string }>(`/api/analyses/${id}/share`, { method: 'POST' }),
  revokeShare: (id: string) =>
    request<{ revoked: true }>(`/api/analyses/${id}/share`, { method: 'DELETE' }),
  getShared: (token: string) => request<SharedAnalysis>(`/api/shared/${encodeURIComponent(token)}`),
};
