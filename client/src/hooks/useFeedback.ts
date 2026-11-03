import { useState } from 'react';

import { FEEDBACK_TEXT } from '../content/feedback';
import { useText } from '../i18n/useText';
import { api } from '../lib/api';
import { useFailure } from './useFailure';

/** The visitor's verdict on an analysis; choosing the same answer again clears it. */
export function useFeedback(analysisId: string, initialHelpful: boolean | null) {
  const [helpful, setHelpful] = useState(initialHelpful);
  const [saving, setSaving] = useState(false);
  const text = useText(FEEDBACK_TEXT);
  const { error, fail, clearFailure } = useFailure();

  async function choose(verdict: boolean) {
    setSaving(true);
    clearFailure();
    try {
      const saved = await api.setFeedback(analysisId, helpful === verdict ? null : verdict);
      setHelpful(saved.helpful);
    } catch (err: unknown) {
      fail(err, text.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  return { helpful, saving, error, choose };
}
