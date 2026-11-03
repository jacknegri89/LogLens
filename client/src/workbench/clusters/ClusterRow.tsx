import { useId, useMemo, useState } from 'react';

import { CLUSTERS_TEXT } from '../../content/workbenchInspect';
import { useText } from '../../i18n/useText';
import { useWorkbench } from '../core/useWorkbench';
import { findLinePosition } from '../inspector/linePosition';
import type { ParsedLine } from '../types';
import { countBuckets, type BucketPlan } from './buckets';
import type { Cluster } from './buildClusters';
import { formatClusterTime } from './clusterTime';
import { Sparkline } from './Sparkline';

interface ClusterRowProps {
  cluster: Cluster;
  lines: readonly ParsedLine[];
  plan: BucketPlan;
}

function TimeRange({ cluster }: { cluster: Cluster }) {
  const text = useText(CLUSTERS_TEXT);
  const { timeMode } = useWorkbench();
  if (cluster.firstTimestamp === null || cluster.lastTimestamp === null) {
    return <>{text.lineRange(cluster.firstIndex + 1, cluster.lastIndex + 1)}</>;
  }
  return (
    <>
      {text.firstSeen} {formatClusterTime(cluster.firstTimestamp, timeMode)} · {text.lastSeen}{' '}
      {formatClusterTime(cluster.lastTimestamp, timeMode)}
    </>
  );
}

function SampleLines({
  cluster,
  lines,
  id,
}: {
  cluster: Cluster;
  lines: readonly ParsedLine[];
  id: string;
}) {
  const text = useText(CLUSTERS_TEXT);
  const { select, selectedIndex } = useWorkbench();
  return (
    <>
      <p className="cluster-samples-title">
        {text.samplesTitle(cluster.sampleIndexes.length, cluster.count)}
      </p>
      <ul id={id} className="cluster-samples">
        {cluster.sampleIndexes.map((index) => (
          <li key={index}>
            <button
              type="button"
              aria-current={index === selectedIndex ? 'true' : undefined}
              onClick={() => select(index)}
            >
              <span className="cluster-sample-number">{text.sampleLine(index + 1)}</span>
              <span className="cluster-sample-text">
                {lines[findLinePosition(lines, index)]?.raw}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function ClusterDetail({ cluster }: { cluster: Cluster }) {
  const text = useText(CLUSTERS_TEXT);
  return (
    <span className="cluster-detail">
      <TimeRange cluster={cluster} />
      {cluster.faultCount > 0 && (
        <>
          {' · '}
          <span className="cluster-fault-text">{text.faults(cluster.faultCount)}</span>
        </>
      )}
      {cluster.services.length > 0 && ` · ${text.services}: ${cluster.services.join(', ')}`}
    </span>
  );
}

function ClusterMeta({ cluster, lines, plan }: ClusterRowProps) {
  const text = useText(CLUSTERS_TEXT);
  const counts = useMemo(
    () => countBuckets(plan, lines, cluster.positions),
    [plan, lines, cluster],
  );
  return (
    <div className="cluster-meta">
      <span className="cluster-count">{text.occurrences(cluster.count)}</span>
      <Sparkline counts={counts} byTime={plan.mode === 'time'} />
      <ClusterDetail cluster={cluster} />
    </div>
  );
}

/** One group of similar lines: its template, how often it happened, when, and a frequency chart. */
export function ClusterRow({ cluster, lines, plan }: ClusterRowProps) {
  const text = useText(CLUSTERS_TEXT);
  const { select } = useWorkbench();
  const [expanded, setExpanded] = useState(false);
  const samplesId = useId();

  return (
    <li className="cluster-row" data-fault={cluster.faultCount > 0}>
      <button
        type="button"
        className="cluster-select"
        title={text.selectFirst}
        onClick={() => select(cluster.firstIndex)}
      >
        <span className="wb-level" data-level={cluster.topLevel ?? 'NONE'}>
          {cluster.topLevel ?? text.noLevel}
        </span>
        <span className="cluster-template">{cluster.template}</span>
      </button>
      <ClusterMeta cluster={cluster} lines={lines} plan={plan} />
      <button
        type="button"
        className="cluster-expand"
        aria-expanded={expanded}
        aria-controls={samplesId}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? text.hideSamples : text.showSamples}
      </button>
      {expanded && <SampleLines cluster={cluster} lines={lines} id={samplesId} />}
    </li>
  );
}
