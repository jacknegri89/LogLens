import { useState } from 'react';

import { HISTORY_TEXT } from '../content/history';
import { useText } from '../i18n/useText';
import { api } from '../lib/api';
import { RequestError } from '../lib/requestError';
import { isServerUnreachable } from '../lib/serverFallback';
import { useFailure } from './useFailure';

/**
 * Whether the card can go even though the server did not confirm: it is already gone there
 * (404), or the card is only the copy kept in this browser and the server cannot be reached.
 */
function isRemovable(failure: unknown, offline: boolean): boolean {
  if (failure instanceof RequestError && failure.status === 404) return true;
  return offline && isServerUnreachable(failure);
}

/** Removes one analysis after the visitor confirms, and tells the caller when it is gone. */
export function useRemoveAnalysis(
  analysisId: string,
  offline: boolean,
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
      if (isRemovable(failure, offline)) onRemoved(analysisId);
      else fail(failure, text.removeFailed);
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
