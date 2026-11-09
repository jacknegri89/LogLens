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

/** Reading and small writes. */
const REQUEST_TIMEOUT_MS = 30_000;
/** An analysis: the server may wait up to 40 s for the model, and its function stops at 60 s. */
const ANALYSIS_TIMEOUT_MS = 90_000;

/** The signal of the caller, if any, together with the timeout: whichever fires first stops the request. */
function signalWithTimeout(callerSignal: AbortSignal | null | undefined, timeoutMs: number) {
  const timeout = AbortSignal.timeout(timeoutMs);
  if (!callerSignal) {
    return timeout;
  }
  return AbortSignal.any([callerSignal, timeout]);
}

async function request<T>(
  path: string,
  init?: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Visitor-Id': getVisitorId(),
        'X-Language': detectLanguage(),
      },
      ...init,
      signal: signalWithTimeout(init?.signal, timeoutMs),
    });
  } catch (failure) {
    // A request that outlived the timeout is told like a gateway timeout, which the pages
    // already know how to explain (and which lets a saved copy stand in for a read).
    if (failure instanceof DOMException && failure.name === 'TimeoutError') {
      throw new RequestError(504);
    }
    throw failure;
  }

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
  const record = await request<AnalysisRecord>(
    '/api/analyses',
    { method: 'POST', body: JSON.stringify(input), signal },
    ANALYSIS_TIMEOUT_MS,
  );
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
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
    if (!isServerUnreachable(failure) || items.length === 0) {
      throw failure;
    }
    return { items, offline: true };
  }
}

async function getAnalysis(id: string): Promise<LoadedAnalysis> {
  try {
    return {
      analysis: await request<AnalysisRecord>(`/api/analyses/${encodeURIComponent(id)}`),
      offline: false,
    };
  } catch (failure) {
    let analysis: AnalysisRecord | null = null;
    if (isServerUnreachable(failure)) {
      analysis = getLocalAnalysis(id);
    }
    if (!analysis) {
      throw failure;
    }
    return { analysis, offline: true };
  }
}

// Keep the local copy until the server confirms the deletion, so it can be retried offline.
async function deleteAnalysis(id: string) {
  try {
    const result = await request<{ deleted: number }>(`/api/analyses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    removeLocalAnalysis(id);
    return result;
  } catch (failure) {
    if (failure instanceof RequestError && failure.status === 404) {
      removeLocalAnalysis(id);
    }
    throw failure;
  }
}

async function deleteAnalyses() {
  const result = await request<{ deleted: number }>('/api/analyses', { method: 'DELETE' });
  clearLocalAnalyses();
  return result;
}

export const api = {
  createAnalysis,
  listAnalyses,
  getAnalysis,
  deleteAnalysis,
  deleteAnalyses,
  setFeedback: (id: string, helpful: boolean | null) =>
    request<{ helpful: boolean | null }>(`/api/analyses/${encodeURIComponent(id)}/feedback`, {
      method: 'PUT',
      body: JSON.stringify({ helpful }),
    }),
  createShare: (id: string) =>
    request<{ shareToken: string }>(`/api/analyses/${encodeURIComponent(id)}/share`, {
      method: 'POST',
    }),
  revokeShare: (id: string) =>
    request<{ revoked: true }>(`/api/analyses/${encodeURIComponent(id)}/share`, {
      method: 'DELETE',
    }),
  getShared: (token: string) => request<SharedAnalysis>(`/api/shared/${encodeURIComponent(token)}`),
};
