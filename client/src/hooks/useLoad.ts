import { useEffect, useState } from 'react';

import { useFailure } from './useFailure';

/** Loads data again whenever `deps` change, and keeps the error message for the page. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[], fallback: string) {
  const [data, setData] = useState<T | null>(null);
  const { error, fail } = useFailure();

  useEffect(() => {
    load()
      .then(setData)
      .catch((failure: unknown) => fail(failure, fallback));
    // The caller decides when to load again, through `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error };
}
