import { useState } from 'react';

import { HISTORY_TEXT } from '../content/history';
import { useText } from '../i18n/useText';
import { api } from '../lib/api';
import { RequestError } from '../lib/requestError';
import { useFailure } from './useFailure';

/**
 * Whether the card can go even though the server did not confirm: it is already gone there
 * (404).
 */
function isRemovable(failure: unknown): boolean {
  return failure instanceof RequestError && failure.status === 404;
}

/** Removes one analysis after the visitor confirms, and tells the caller when it is gone. */
export function useRemoveAnalysis(
  analysisId: string,
  _offline: boolean,
  onRemoved: (id: string) => void,
) {
  const text = useText(HISTORY_TEXT);
  const { error, fail, clearFailure } = useFailure();
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function remove() {
    setRemoving(true);
    clearFailure();
    try {
      await api.deleteAnalysis(analysisId);
      onRemoved(analysisId);
    } catch (failure: unknown) {
      if (isRemovable(failure)) {
        onRemoved(analysisId);
      } else {
        fail(failure, text.removeFailed);
      }
      setRemoving(false);
    }
  }

  return {
    confirming,
    removing,
    error,
    start: () => setConfirming(true),
    cancel: () => setConfirming(false),
    remove,
  };
}
