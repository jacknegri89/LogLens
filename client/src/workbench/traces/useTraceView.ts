import { useMemo, useState } from 'react';

import type { ParsedLine } from '../types';
import { buildCorrelations, type Correlation } from './correlationIds';
import { buildWaterfall, type Waterfall } from './waterfall';

/** Ids listed at first and added by each "show more". */
export const ID_PAGE_SIZE = 100;
/** Steps drawn in one waterfall; a longer request shows its first steps and says how many are left. */
export const MAX_STEPS = 300;

export interface TraceView {
  total: number;
  visible: Correlation[];
  hiddenCount: number;
  active: Correlation | null;
  waterfall: Waterfall | null;
  filter: string;
  setFilter: (value: string) => void;
  choose: (id: string) => void;
  showMore: () => void;
}

export function matchesFilter(correlation: Correlation, filter: string): boolean {
  return correlation.id.toLowerCase().includes(filter.trim().toLowerCase());
}

/** The id filter and the page size. Changing the filter goes back to the first page. */
function useIdFilter() {
  const [filter, setFilterState] = useState('');
  const [limit, setLimit] = useState(ID_PAGE_SIZE);
  return {
    filter,
    limit,
    setFilter: (value: string) => {
      setFilterState(value);
      setLimit(ID_PAGE_SIZE);
    },
    showMore: () => setLimit((current) => current + ID_PAGE_SIZE),
  };
}

/** The chosen request (the first one until another is chosen) and its waterfall. */
function useActiveTrace(correlations: readonly Correlation[], lines: readonly ParsedLine[]) {
  const [chosenId, choose] = useState<string | null>(null);
  const active = correlations.find((item) => item.id === chosenId) ?? correlations[0] ?? null;
  const waterfall = useMemo(() => {
    if (active) {
      return buildWaterfall(active.positions.map((position) => lines[position]));
    }
    return null;
  }, [active, lines]);
  return { active, waterfall, choose };
}

/** The request ids of the loaded log, the filter on them and the waterfall of the chosen one. */
export function useTraceView(lines: readonly ParsedLine[]): TraceView {
  const { filter, limit, setFilter, showMore } = useIdFilter();
  const correlations = useMemo(() => buildCorrelations(lines), [lines]);
  const matching = useMemo(
    () => correlations.filter((item) => matchesFilter(item, filter)),
    [correlations, filter],
  );
  const visible = matching.slice(0, limit);
  return {
    ...useActiveTrace(correlations, lines),
    total: matching.length,
    visible,
    hiddenCount: matching.length - visible.length,
    filter,
    setFilter,
    showMore,
  };
}
