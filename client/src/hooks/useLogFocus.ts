import { useEffect, useState } from 'react';

import { parseLogHash, type LineRange } from '../lib/logFocus';

/**
 * The lines of the original log that the address points at (`#log-12`), kept in step with the
 * address: a click on a piece of evidence changes the hash and the log follows.
 */
export function useLogFocus(): LineRange | null {
  const [range, setRange] = useState<LineRange | null>(() => parseLogHash(window.location.hash));

  useEffect(() => {
    const follow = () => setRange(parseLogHash(window.location.hash));
    window.addEventListener('hashchange', follow);
    return () => window.removeEventListener('hashchange', follow);
  }, []);

  return range;
}
