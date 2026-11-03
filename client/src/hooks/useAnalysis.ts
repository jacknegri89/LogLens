import { useRef, useState } from 'react';

import { api, type CreateAnalysisInput } from '../lib/api';
import { friendlyError } from '../lib/errors';
import type { AnalysisRecord } from '../lib/types';

export type AnalysisStatus = 'idle' | 'loading' | 'error';

interface AnalysisState {
  status: AnalysisStatus;
  error: string;
  result: AnalysisRecord | null;
}

const IDLE: AnalysisState = { status: 'idle', error: '', result: null };

/** The state a finished request leads to, or null when the visitor cancelled it. */
async function requestAnalysis(
  input: CreateAnalysisInput,
  signal: AbortSignal,
): Promise<AnalysisState | null> {
  try {
    const result = await api.createAnalysis(input, signal);
    return { status: 'idle', error: '', result };
  } catch (error) {
    if (isAbort(error)) return null;
    return { status: 'error', error: friendlyError(error), result: null };
  }
}

/** Sends a log for analysis and keeps the state of the last request. */
export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>(IDLE);
  const abortRef = useRef<AbortController | null>(null);

  async function run(input: CreateAnalysisInput) {
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: 'loading', error: '', result: null });
    const outcome = await requestAnalysis(input, controller.signal);
    if (outcome) setState(outcome);
    abortRef.current = null;
  }

  function cancel() {
    abortRef.current?.abort();
    abortRef.current = null;
    setState((previous) => ({ ...previous, status: 'idle' }));
  }

  return { ...state, run, cancel };
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
