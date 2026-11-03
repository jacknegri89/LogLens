import { useState } from 'react';

import { HISTORY_TEXT } from '../content/history';
import { api } from '../lib/api';
import { errorMessage } from '../lib/errors';

/** Erases the whole history after a confirmation, then tells the caller it is done. */
export function useClearHistory(onCleared: () => void) {
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState('');

  async function clear() {
    setClearing(true);
    setError('');
    try {
      await api.deleteAnalyses();
      setConfirming(false);
      onCleared();
    } catch (err: unknown) {
      setError(errorMessage(err, HISTORY_TEXT.clearFailed));
    } finally {
      setClearing(false);
    }
  }

  return {
    confirming,
    clearing,
    error,
    start: () => setConfirming(true),
    cancel: () => setConfirming(false),
    clear,
  };
}
