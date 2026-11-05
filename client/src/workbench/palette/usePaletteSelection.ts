import { useState } from 'react';

/** The highlighted row of a list of `count` rows; moving past an end wraps around. */
export function usePaletteSelection(count: number) {
  const [requested, setRequested] = useState(0);
  let active = -1;
  if (count !== 0) {
    active = Math.min(requested, count - 1);
  }

  function move(delta: number) {
    if (count > 0) {
      setRequested((active + delta + count) % count);
    }
  }

  return {
    active,
    move,
    moveTo: setRequested,
    first: () => setRequested(0),
    last: () => setRequested(Math.max(count - 1, 0)),
  };
}
