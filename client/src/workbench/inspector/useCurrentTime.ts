import { useState } from 'react';

/** The time when the component first rendered, so relative ages do not change while one line is read. */
export function useCurrentTime(): number {
  const [now] = useState(() => Date.now());
  return now;
}
