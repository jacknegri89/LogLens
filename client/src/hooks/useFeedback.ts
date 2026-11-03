import { useState } from 'react';

import { FEEDBACK_TEXT } from '../content/feedback';
import { api } from '../lib/api';
import { errorMessage } from '../lib/errors';

/** The visitor's verdict on an analysis; choosing the same answer again clears it. */
export function useFeedback(analysisId: string, initialHelpful: boolean | null) {
  const [helpful, setHelpful] = useState(initialHelpful);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function choose(verdict: boolean) {
    setSaving(true);
    setError('');
    try {
      const saved = await api.setFeedback(analysisId, helpful === verdict ? null : verdict);
      setHelpful(saved.helpful);
    } catch (err: unknown) {
      setError(errorMessage(err, FEEDBACK_TEXT.saveFailed));
    } finally {
      setSaving(false);
    }
  }

  return { helpful, saving, error, choose };
}
