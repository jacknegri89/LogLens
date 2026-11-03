import { useMemo } from 'react';

import type { ParsedLine } from '../types';
import type { InspectorKeyAction } from './inspectorKeys';
import { neighbourLine } from './linePosition';

export interface LineNavigation {
  hasPrevious: boolean;
  hasNext: boolean;
  actions: Record<InspectorKeyAction, () => void>;
}

/** Closing and moving to the line before or after, which do nothing at the ends of the log. */
export function useLineNavigation(
  lines: readonly ParsedLine[],
  currentIndex: number,
  select: (index: number | null) => void,
): LineNavigation {
  const previous = neighbourLine(lines, currentIndex, -1);
  const next = neighbourLine(lines, currentIndex, 1);
  const actions = useMemo(
    () => ({
      close: () => select(null),
      previous: () => {
        if (previous) select(previous.index);
      },
      next: () => {
        if (next) select(next.index);
      },
    }),
    [select, previous, next],
  );
  return { hasPrevious: previous !== null, hasNext: next !== null, actions };
}
