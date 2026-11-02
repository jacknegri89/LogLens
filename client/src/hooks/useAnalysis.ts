import { useRef, useState } from 'react';

import { api, type CreateAnalysisInput } from '../lib/api';
import { friendlyError } from '../lib/errors';
import type { AnalysisRecord } from '../lib/types';

export type AnalysisStatus = 'idle' | 'loading' | 'error';

/** Sends a log for analysis and keeps the state of the last request. */
export function useAnalysis() {
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalysisRecord | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function run(input: CreateAnalysisInput) {
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('loading');
    setError('');
    setResult(null);
    try {
      const record = await api.createAnalysis(input, controller.signal);
      setResult(record);
      setStatus('idle');
    } catch (err) {
      if (!isAbort(err)) showFailure(err);
    } finally {
      abortRef.current = null;
    }

    function showFailure(err: unknown) {
      setError(friendlyError(err));
      setStatus('error');
    }
  }

  function cancel() {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus('idle');
  }

  return { status, error, result, run, cancel };
}

function isAbort(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}
