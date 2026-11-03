import { useMemo, useState } from 'react';

import type { ParsedLine } from '../types';
import { planBuckets, type BucketPlan } from './buckets';
import {
  buildClusters,
  filterClusters,
  sortClusters,
  type Cluster,
  type ClusterSort,
} from './buildClusters';

/** Clusters rendered at first and added by each "show more", so 50,000 lines stay fast. */
export const PAGE_SIZE = 200;

export interface ClusterView {
  total: number;
  visible: Cluster[];
  hiddenCount: number;
  plan: BucketPlan;
  faultsOnly: boolean;
  sort: ClusterSort;
  setFaultsOnly: (value: boolean) => void;
  setSort: (value: ClusterSort) => void;
  showMore: () => void;
}

/** The chosen filter and order. Changing either goes back to the first page. */
function useClusterOptions() {
  const [faultsOnly, setFaultsOnlyState] = useState(false);
  const [sort, setSortState] = useState<ClusterSort>('count');
  const [limit, setLimit] = useState(PAGE_SIZE);
  return {
    faultsOnly,
    sort,
    limit,
    setFaultsOnly: (value: boolean) => {
      setFaultsOnlyState(value);
      setLimit(PAGE_SIZE);
    },
    setSort: (value: ClusterSort) => {
      setSortState(value);
      setLimit(PAGE_SIZE);
    },
    showMore: () => setLimit((current) => current + PAGE_SIZE),
  };
}

/** The clusters of the loaded log with the chosen filter and order. The heavy work runs once per log. */
export function useClusterView(lines: readonly ParsedLine[]): ClusterView {
  const options = useClusterOptions();
  const clusters = useMemo(() => buildClusters(lines), [lines]);
  const plan = useMemo(() => planBuckets(lines), [lines]);
  const { faultsOnly, sort, limit } = options;
  const ordered = useMemo(
    () => sortClusters(filterClusters(clusters, faultsOnly), sort),
    [clusters, faultsOnly, sort],
  );
  return {
    ...options,
    total: ordered.length,
    visible: ordered.slice(0, limit),
    hiddenCount: Math.max(0, ordered.length - limit),
    plan,
  };
}
