import { useState } from 'react';

import { HISTORY_TEXT } from '../content/history';
import { useText } from '../i18n/useText';
import { api } from '../lib/api';
import { useFailure } from './useFailure';

/** Deletes the whole history and keeps the progress and the failure message of the request. */
function useDeleteHistory() {
  const text = useText(HISTORY_TEXT);
  const { error, fail, clearFailure } = useFailure();
  const [clearing, setClearing] = useState(false);

  async function deleteAll(): Promise<boolean> {
    setClearing(true);
    clearFailure();
    try {
      await api.deleteAnalyses();
      return true;
    } catch (failure: unknown) {
      fail(failure, text.clearFailed);
      return false;
    } finally {
      setClearing(false);
    }
  }

  return { clearing, error, deleteAll };
}

/** Erases the whole history after a confirmation, then tells the caller it is done. */
export function useClearHistory(onCleared: () => void) {
  const [confirming, setConfirming] = useState(false);
  const { clearing, error, deleteAll } = useDeleteHistory();

  async function clear() {
    if (!(await deleteAll())) {
      return;
    }
    setConfirming(false);
    onCleared();
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

export type ClearHistoryControls = ReturnType<typeof useClearHistory>;
