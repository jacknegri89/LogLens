import type { LogLevel, ParsedLine } from '../types';
import { fingerprint } from './fingerprint';

export const MAX_SAMPLES = 20;

const LEVEL_RANK: Record<LogLevel, number> = {
  FATAL: 5,
  ERROR: 4,
  WARN: 3,
  INFO: 2,
  DEBUG: 1,
  TRACE: 0,
};

export interface Cluster {
  template: string;
  count: number;
  firstTimestamp: number | null;
  lastTimestamp: number | null;
  firstIndex: number;
  lastIndex: number;
  levelCounts: Partial<Record<LogLevel, number>>;
  /** The most severe level among the lines, or null when no line has one. */
  topLevel: LogLevel | null;
  services: string[];
  faultCount: number;
  /** The `index` of the first lines of the cluster, up to MAX_SAMPLES. */
  sampleIndexes: number[];
  /** Positions of the members in the `lines` array, for the frequency chart. */
  positions: number[];
}

export type ClusterSort = 'count' | 'recency' | 'severity';

export function levelRank(level: LogLevel | null): number {
  if (level === null) {
    return -1;
  }
  return LEVEL_RANK[level];
}

function startCluster(template: string, line: ParsedLine): Cluster {
  return {
    template,
    count: 0,
    firstTimestamp: null,
    lastTimestamp: null,
    firstIndex: line.index,
    lastIndex: line.index,
    levelCounts: {},
    topLevel: null,
    services: [],
    faultCount: 0,
    sampleIndexes: [],
    positions: [],
  };
}

function addLine(cluster: Cluster, line: ParsedLine, position: number): void {
  cluster.count += 1;
  cluster.lastIndex = line.index;
  cluster.positions.push(position);
  if (cluster.sampleIndexes.length < MAX_SAMPLES) {
    cluster.sampleIndexes.push(line.index);
  }
  if (line.isFault) {
    cluster.faultCount += 1;
  }
  if (line.service !== null && !cluster.services.includes(line.service)) {
    cluster.services.push(line.service);
  }
  if (line.timestamp !== null) {
    cluster.firstTimestamp ??= line.timestamp;
    cluster.lastTimestamp = line.timestamp;
  }
  if (line.level !== null) {
    cluster.levelCounts[line.level] = (cluster.levelCounts[line.level] ?? 0) + 1;
    if (levelRank(line.level) > levelRank(cluster.topLevel)) {
      cluster.topLevel = line.level;
    }
  }
}

/** The message without its leading `[service]` tag: the services are listed apart on the cluster. */
function templateSource(line: ParsedLine): string {
  if (line.service === null) {
    return line.message;
  }
  const tag = `[${line.service}]`;
  if (line.message.startsWith(tag)) {
    return line.message.slice(tag.length).trimStart();
  }
  return line.message;
}

/** Groups the lines by message template, in order of first appearance. */
export function buildClusters(lines: readonly ParsedLine[]): Cluster[] {
  const byTemplate = new Map<string, Cluster>();
  lines.forEach((line, position) => {
    const template = fingerprint(templateSource(line));
    let cluster = byTemplate.get(template);
    if (!cluster) {
      cluster = startCluster(template, line);
      byTemplate.set(template, cluster);
    }
    addLine(cluster, line, position);
  });
  return [...byTemplate.values()];
}

function compareRecency(first: Cluster, second: Cluster): number {
  if (first.lastTimestamp !== null && second.lastTimestamp !== null) {
    return second.lastTimestamp - first.lastTimestamp;
  }
  return second.lastIndex - first.lastIndex;
}

function compareSeverity(first: Cluster, second: Cluster): number {
  return (
    second.faultCount - first.faultCount ||
    levelRank(second.topLevel) - levelRank(first.topLevel) ||
    second.count - first.count
  );
}

/** A sorted copy. Ties keep the order of first appearance, so the list does not jump around. */
export function sortClusters(clusters: readonly Cluster[], sort: ClusterSort): Cluster[] {
  const compare = {
    count: (first: Cluster, second: Cluster) => second.count - first.count,
    recency: compareRecency,
    severity: compareSeverity,
  }[sort];
  return [...clusters].sort(compare);
}

export function filterClusters(clusters: readonly Cluster[], faultsOnly: boolean): Cluster[] {
  if (faultsOnly) {
    return clusters.filter((cluster) => cluster.faultCount > 0);
  }
  return [...clusters];
}
