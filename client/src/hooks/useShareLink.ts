import { useState } from 'react';

import { SHARE_TEXT } from '../content/share';
import { useText } from '../i18n/useText';
import { api } from '../lib/api';
import { useFailure } from './useFailure';

/** Creates or revokes the read-only link of an analysis and keeps the current token. */
export function useShareLink(analysisId: string, initialToken: string | null) {
  const [shareToken, setShareToken] = useState(initialToken);
  const [busy, setBusy] = useState(false);
  const text = useText(SHARE_TEXT);
  const { error, fail, clearFailure } = useFailure();

  async function change(action: () => Promise<string | null>, failure: string) {
    setBusy(true);
    clearFailure();
    try {
      setShareToken(await action());
    } catch (err: unknown) {
      fail(err, failure);
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
    create: () => change(createToken, text.createFailed),
    stop: () => change(revokeToken, text.stopFailed),
  };
}
