import { useState } from 'react';

import { SHARE_TEXT } from '../content/share';
import { api } from '../lib/api';
import { errorMessage } from '../lib/errors';

/** Creates or revokes the read-only link of an analysis and keeps the current token. */
export function useShareLink(analysisId: string, initialToken: string | null) {
  const [shareToken, setShareToken] = useState(initialToken);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function change(action: () => Promise<string | null>, failure: string) {
    setBusy(true);
    setError('');
    try {
      setShareToken(await action());
    } catch (err: unknown) {
      setError(errorMessage(err, failure));
    } finally {
      setBusy(false);
    }
  }

  async function createToken() {
    return (await api.createShare(analysisId)).shareToken;
  }

  async function revokeToken() {
    await api.revokeShare(analysisId);
    return null;
  }

  return {
    shareToken,
    busy,
    error,
    create: () => change(createToken, SHARE_TEXT.createFailed),
    stop: () => change(revokeToken, SHARE_TEXT.stopFailed),
  };
}
