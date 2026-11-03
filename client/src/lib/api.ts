import type { AnalysisRecord, AnalysisSummary, SharedAnalysis } from './types';
import { detectLanguage } from '../i18n/languages';
import {
  clearLocalAnalyses,
  getLocalAnalysis,
  listLocalAnalyses,
  removeLocalAnalysis,
  saveLocalAnalysis,
} from './localHistory';
import { RequestError } from './requestError';
import { isServerUnreachable } from './serverFallback';
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

/** The history rows; `offline` is true when they come from the copy kept in this browser. */
export interface AnalysisList {
  items: AnalysisSummary[];
  offline: boolean;
}

/** One analysis; `offline` is true when it comes from the copy kept in this browser. */
export interface LoadedAnalysis {
  analysis: AnalysisRecord;
  offline: boolean;
}

async function createAnalysis(input: CreateAnalysisInput, signal?: AbortSignal) {
  const record = await request<AnalysisRecord>('/api/analyses', {
    method: 'POST',
    body: JSON.stringify(input),
    signal,
  });
  saveLocalAnalysis(record);
  return record;
}

// When the server cannot be reached the local copy stands in for it. If there is no local
// copy either, the original failure is thrown so the page can explain it.
async function listAnalyses(): Promise<AnalysisList> {
  try {
    return { items: await request<AnalysisSummary[]>('/api/analyses'), offline: false };
  } catch (failure) {
    const items = listLocalAnalyses();
    if (!isServerUnreachable(failure) || items.length === 0) throw failure;
    return { items, offline: true };
  }
}

async function getAnalysis(id: string): Promise<LoadedAnalysis> {
  try {
    return { analysis: await request<AnalysisRecord>(`/api/analyses/${id}`), offline: false };
  } catch (failure) {
    const analysis = isServerUnreachable(failure) ? getLocalAnalysis(id) : null;
    if (!analysis) throw failure;
    return { analysis, offline: true };
  }
}

// The local copy goes whatever the server answers: the visitor asked for it to be gone.
async function deleteAnalysis(id: string) {
  try {
    return await request<{ deleted: number }>(`/api/analyses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } finally {
    removeLocalAnalysis(id);
  }
}

async function deleteAnalyses() {
  try {
    return await request<{ deleted: number }>('/api/analyses', { method: 'DELETE' });
  } finally {
    clearLocalAnalyses();
  }
}

export const api = {
  createAnalysis,
  listAnalyses,
  getAnalysis,
  deleteAnalysis,
  deleteAnalyses,
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
