import { useState } from 'react';

import { ERROR_TEXT } from '../content/errors';
import { useText } from '../i18n/useText';
import { errorMessage } from '../lib/errors';

interface Failure {
  cause: unknown;
  fallback?: string;
}

/**
 * Keeps the last failure of a request. The message is written when the page is drawn, not
 * when the request fails, so it follows a change of language.
 */
export function useFailure() {
  const errorText = useText(ERROR_TEXT);
  const [failure, setFailure] = useState<Failure | null>(null);
  let error = '';
  if (failure) {
    error = errorMessage(failure.cause, failure.fallback ?? errorText.unknown, errorText);
  }

  return {
    error,
    fail: (cause: unknown, fallback?: string) => setFailure({ cause, fallback }),
    clearFailure: () => setFailure(null),
  };
}
