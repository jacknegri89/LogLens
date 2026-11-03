import { useDeferredValue, useMemo } from 'react';

import type { ParsedLine } from '../types';
import { faultFocusMarks } from './list/faultFocus';
import { filterLines, highlightTerms } from './query/matchQuery';
import { parseQuery } from './query/parseQuery';

/**
 * The rows the Explorer shows. The query is deferred, so typing stays responsive while a
 * long log is filtered.
 */
export function useExplorerFilter(
  lines: readonly ParsedLine[],
  queryText: string,
  focusFaults: boolean,
) {
  const deferredText = useDeferredValue(queryText);
  const query = useMemo(() => parseQuery(deferredText), [deferredText]);
  const marks = useMemo(() => (focusFaults ? faultFocusMarks(lines) : null), [lines, focusFaults]);
  const rows = useMemo(
    () => filterLines(lines, query, marks && ((position) => marks[position] === 1)),
    [lines, query, marks],
  );
  const highlights = useMemo(() => highlightTerms(query), [query]);
  return { query, rows, highlights };
}
