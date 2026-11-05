import type { AnalysisRecord, TimelineEntry } from '../../lib/types';
import type { ParsedLine } from '../types';

export type TopologyKind =
  | 'loadBalancer'
  | 'api'
  | 'service'
  | 'database'
  | 'cache'
  | 'queue'
  | 'external';
export type TopologyRole = 'origin' | 'affected' | 'healthy' | 'unknown';

export interface TopologyNode {
  id: string;
  kind: TopologyKind;
  /** The service name from the log, only for generic `service` nodes. */
  name: string | null;
  /** Column (or row) of the chain: 0 load balancer, 1 API, 2 services, 3 data and dependencies. */
  tier: number;
  role: TopologyRole;
}

export interface TopologyEdge {
  from: string;
  to: string;
  /** The incident travelled along this edge; `from` is then the side it came from. */
  propagating: boolean;
}

export interface Topology {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  originIds: string[];
  affectedIds: string[];
  /** False when the analysis gave no origin, so every node is just "found in the log". */
  hasDiagnosis: boolean;
  /** Fewer than two parts found: the chain cannot be drawn. */
  sparse: boolean;
}

const TIER_OF_KIND: Record<TopologyKind, number> = {
  loadBalancer: 0,
  api: 1,
  service: 2,
  database: 3,
  cache: 3,
  queue: 3,
  external: 3,
};

/** First match wins, so "nginx upstream timed out" is the load balancer, not an external call. */
const KEYWORD_RULES: [TopologyKind, RegExp][] = [
  [
    'loadBalancer',
    /\b(?:nginx|haproxy|envoy|elb|alb|ingress|traefik)\b|\b50[24]\s+(?:bad gateway|gateway time-?out)|(?:status[=: ]+|http\/[\d.]+"?\s+)50[24]\b/i,
  ],
  [
    'database',
    /\b(?:postgres(?:ql)?|mysql|mariadb|prisma|mongo(?:db)?|sqlstate|database)\b|:(?:5432|3306|27017)\b/i,
  ],
  ['cache', /\b(?:redis|memcached)\b|:6379\b/i],
  ['queue', /\b(?:kafka|rabbit(?:mq)?|sqs|amqp)\b|:(?:5672|9092)\b/i],
  [
    'external',
    /\b(?:x509|tls|ssl|upstream|enotfound|getaddrinfo|etimedout|axios|socket hang up)\b|http client/i,
  ],
  ['api', /\b(?:express|fastapi|flask|django|koa|nestjs|next\.?js|gateway|api|controller)\b/i],
];

/** What an analysis category says about where the failure lives, when the text says nothing. */
const KIND_OF_CATEGORY: Record<string, TopologyKind> = {
  database: 'database',
  'database connection failure': 'database',
  runtime: 'api',
  'server error': 'api',
  'client error': 'api',
  'security attack': 'api',
  authentication: 'api',
  'access denied': 'api',
  permissions: 'api',
  'rate limit': 'api',
  network: 'external',
  infrastructure: 'service',
  filesystem: 'service',
};

const MAX_NAMED_SERVICES = 3;
const MAX_SCANNED_LINES = 5000;

/** The kind of component a piece of text talks about, or null when no keyword is in it. */
export function classifyText(text: string): TopologyKind | null {
  return KEYWORD_RULES.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

function kindOfEntry(
  entry: Pick<TimelineEntry, 'title' | 'evidence' | 'category'>,
): TopologyKind | null {
  return (
    classifyText(`${entry.title} ${entry.evidence}`) ??
    KIND_OF_CATEGORY[entry.category.trim().toLowerCase()] ??
    null
  );
}

type NodeMap = Map<string, TopologyNode>;

function ensureNode(nodes: NodeMap, kind: TopologyKind, name: string | null = null): TopologyNode {
  let id: string = kind;
  if (kind === 'service' && name) {
    id = `service:${name}`;
  }
  const existing = nodes.get(id);
  if (existing) {
    return existing;
  }
  const node: TopologyNode = { id, kind, name, tier: TIER_OF_KIND[kind], role: 'unknown' };
  nodes.set(id, node);
  return node;
}

function topServiceNames(lines: ParsedLine[]): string[] {
  const counts = new Map<string, number>();
  for (const line of lines) {
    if (line.service) {
      counts.set(line.service, (counts.get(line.service) ?? 0) + 1);
    }
  }
  return [...counts]
    .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))
    .slice(0, MAX_NAMED_SERVICES)
    .map(([name]) => name);
}

function addNodesFromLog(nodes: NodeMap, lines: ParsedLine[]): void {
  for (const name of topServiceNames(lines)) {
    const kind = classifyText(name) ?? 'service';
    let serviceName: string | null = null;
    if (kind === 'service') {
      serviceName = name;
    }
    ensureNode(nodes, kind, serviceName);
  }
  for (const line of lines.slice(0, MAX_SCANNED_LINES)) {
    const kind = classifyText(line.raw);
    if (kind && kind !== 'service') {
      ensureNode(nodes, kind);
    }
  }
}

function addNodesFromReport(nodes: NodeMap, record: AnalysisRecord): void {
  const entries = [...(record.report.findings ?? []), ...(record.report.timeline ?? [])];
  for (const entry of entries) {
    const kind = kindOfEntry(entry);
    if (kind) {
      resolveNode(nodes, kind, entry.evidence);
    }
  }
}

/** A generic service entry points at the named service its evidence mentions, else the first one. */
function resolveNode(nodes: NodeMap, kind: TopologyKind, evidence: string): TopologyNode {
  if (kind !== 'service') {
    return ensureNode(nodes, kind);
  }
  const named = [...nodes.values()].filter((node) => node.kind === 'service' && node.name);
  const mentioned = named.find((node) => evidence.toLowerCase().includes(node.name!.toLowerCase()));
  return mentioned ?? named[0] ?? ensureNode(nodes, 'service');
}

interface Diagnosis {
  origins: Set<string>;
  affected: Set<string>;
}

function diagnose(nodes: NodeMap, record: AnalysisRecord | null): Diagnosis {
  const diagnosis: Diagnosis = { origins: new Set(), affected: new Set() };
  const timeline = record?.report.timeline ?? [];
  const roots = timeline.filter((entry) => entry.role === 'root');
  for (const entry of roots) {
    const kind = kindOfEntry(entry);
    if (kind) {
      diagnosis.origins.add(resolveNode(nodes, kind, entry.evidence).id);
    }
  }
  if (roots.length === 0 && record) {
    addOriginFromCategory(nodes, record, diagnosis);
  }
  for (const entry of timeline.filter((item) => item.role === 'effect')) {
    const kind = kindOfEntry(entry);
    let id: string | null = null;
    if (kind) {
      id = resolveNode(nodes, kind, entry.evidence).id;
    }
    if (id && !diagnosis.origins.has(id)) {
      diagnosis.affected.add(id);
    }
  }
  return diagnosis;
}

function addOriginFromCategory(nodes: NodeMap, record: AnalysisRecord, diagnosis: Diagnosis): void {
  const firstLine = record.report.keyLines[0] ?? '';
  const kind = kindOfEntry({ title: record.title, evidence: firstLine, category: record.category });
  if (kind) {
    diagnosis.origins.add(resolveNode(nodes, kind, firstLine).id);
  }
}

function structureEdges(nodes: TopologyNode[]): TopologyEdge[] {
  const tiers = [...new Set(nodes.map((node) => node.tier))].sort(
    (first, second) => first - second,
  );
  const edges: TopologyEdge[] = [];
  tiers.slice(0, -1).forEach((tier, position) => {
    const next = tiers[position + 1];
    for (const from of nodes.filter((node) => node.tier === tier)) {
      for (const to of nodes.filter((node) => node.tier === next)) {
        edges.push({ from: from.id, to: to.id, propagating: false });
      }
    }
  });
  return edges;
}

/** Shortest path between two nodes over the edges in either direction, as a list of node ids. */
function shortestPath(edges: TopologyEdge[], start: string, goal: string): string[] {
  const previous = new Map<string, string>([[start, start]]);
  const queue = [start];
  while (queue.length > 0 && !previous.has(goal)) {
    const current = queue.shift()!;
    for (const edge of edges) {
      let next: string | null = null;
      if (edge.from === current) {
        next = edge.to;
      } else if (edge.to === current) {
        next = edge.from;
      }
      if (next && !previous.has(next)) {
        previous.set(next, current);
        queue.push(next);
      }
    }
  }
  return walkBack(previous, start, goal);
}

function walkBack(previous: Map<string, string>, start: string, goal: string): string[] {
  if (!previous.has(goal)) {
    return [];
  }
  const path = [goal];
  while (path[0] !== start) path.unshift(previous.get(path[0])!);
  return path;
}

/** Marks the edges between each origin and each affected node, turned to the way the incident went. */
function markPropagation(edges: TopologyEdge[], diagnosis: Diagnosis): void {
  for (const origin of diagnosis.origins) {
    for (const target of diagnosis.affected) {
      const path = shortestPath(edges, origin, target);
      path.slice(0, -1).forEach((id, step) => orientEdge(edges, id, path[step + 1]));
    }
  }
}

function orientEdge(edges: TopologyEdge[], from: string, to: string): void {
  const edge = edges.find(
    (item) => (item.from === from && item.to === to) || (item.from === to && item.to === from),
  );
  if (edge) {
    Object.assign(edge, { from, to, propagating: true });
  }
}

function assignRoles(nodes: TopologyNode[], diagnosis: Diagnosis): void {
  const diagnosed = diagnosis.origins.size > 0;
  for (const node of nodes) {
    if (diagnosis.origins.has(node.id)) {
      node.role = 'origin';
    } else if (diagnosis.affected.has(node.id)) {
      node.role = 'affected';
    } else if (diagnosed) {
      node.role = 'healthy';
    } else {
      node.role = 'unknown';
    }
  }
}

/**
 * The parts of the system found in the log and the report, the incident's origin and what it
 * reached. Without an origin from the analysis every part is "unknown", not "healthy".
 */
export function buildTopology(lines: ParsedLine[], record: AnalysisRecord | null): Topology {
  const nodeMap: NodeMap = new Map();
  addNodesFromLog(nodeMap, lines);
  if (record) {
    addNodesFromReport(nodeMap, record);
  }
  const diagnosis = diagnose(nodeMap, record);
  const nodes = [...nodeMap.values()].sort((first, second) => first.tier - second.tier);
  assignRoles(nodes, diagnosis);
  const edges = structureEdges(nodes);
  markPropagation(edges, diagnosis);
  return {
    nodes,
    edges,
    originIds: [...diagnosis.origins],
    affectedIds: [...diagnosis.affected],
    hasDiagnosis: diagnosis.origins.size > 0,
    sparse: nodes.length < 2,
  };
}
