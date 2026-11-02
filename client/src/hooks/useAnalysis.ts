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

/** Sends a log for analysis and keeps the state of the last request. */
export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>(IDLE);
  const abortRef = useRef<AbortController | null>(null);

  async function run(input: CreateAnalysisInput) {
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: 'loading', error: '', result: null });
    try {
      const result = await api.createAnalysis(input, controller.signal);
      setState({ status: 'idle', error: '', result });
    } catch (err) {
      if (!isAbort(err)) setState({ status: 'error', error: friendlyError(err), result: null });
    } finally {
      abortRef.current = null;
    }
  }

  function cancel() {
    abortRef.current?.abort();
    abortRef.current = null;
    setState((previous) => ({ ...previous, status: 'idle' }));
  }

  return { ...state, run, cancel };
}

function isAbort(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}
