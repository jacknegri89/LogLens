import { useRef, useState } from 'react';

import { api, type CreateAnalysisInput } from '../lib/api';
import { useFailure } from './useFailure';
import type { AnalysisRecord } from '../lib/types';

export type AnalysisStatus = 'idle' | 'loading' | 'error';

interface AnalysisState {
  status: AnalysisStatus;
  result: AnalysisRecord | null;
}

const IDLE: AnalysisState = { status: 'idle', result: null };

/** How a finished request ended; null when the visitor cancelled it. */
type Outcome = { result: AnalysisRecord } | { failure: unknown } | null;

async function requestAnalysis(input: CreateAnalysisInput, signal: AbortSignal): Promise<Outcome> {
  try {
    return { result: await api.createAnalysis(input, signal) };
  } catch (failure) {
    return isAbort(failure) ? null : { failure };
  }
}

/** Sends a log for analysis and keeps the state of the last request. */
export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>(IDLE);
  const { error, fail, clearFailure } = useFailure();
  const abortRef = useRef<AbortController | null>(null);

  function settle(outcome: Outcome) {
    if (!outcome) return;
    if ('failure' in outcome) {
      fail(outcome.failure);
      setState({ status: 'error', result: null });
    } else {
      setState({ status: 'idle', result: outcome.result });
    }
  }

  async function run(input: CreateAnalysisInput) {
    const controller = new AbortController();
    abortRef.current = controller;
    clearFailure();
    setState({ status: 'loading', result: null });
    settle(await requestAnalysis(input, controller.signal));
    abortRef.current = null;
  }

  function cancel() {
    abortRef.current?.abort();
    abortRef.current = null;
    setState((previous) => ({ ...previous, status: 'idle' }));
  }

  /** Stops a request that is running and forgets the last result. */
  function reset() {
    cancel();
    clearFailure();
    setState(IDLE);
  }

  return { ...state, error, run, cancel, reset };
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
