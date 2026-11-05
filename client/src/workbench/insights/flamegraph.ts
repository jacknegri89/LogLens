import type { ParsedLine } from '../types';

export type FlameKind = 'root' | 'service' | 'operation' | 'other';

export interface FlameNode {
  /** Stable across renders, so a zoom survives a re-render of the same log. */
  id: string;
  kind: FlameKind;
  label: string;
  /** Sum of the latencies below this node, in milliseconds. */
  total: number;
  count: number;
  max: number;
  /** Fraction (0 to 1) of the whole tree's latency. */
  share: number;
  /** Position of the service in the root's order, used to pick a colour. -1 for the root. */
  serviceIndex: number;
  /** Only on `other`: how many distinct operations were merged into it. */
  mergedOperations: number;
  children: FlameNode[];
}

export const UNKNOWN_SERVICE = 'unknown';
/** More operations than this per service would only be slivers, so the tail is merged. */
export const MAX_OPERATIONS_PER_SERVICE = 12;

const HTTP_REQUEST = /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\/[^\s?#"']*)/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LONG_HEX = /^(?=.*\d)[0-9a-f]{8,}$/i;
const NUMBER = /^\d+$/;
const MAX_LABEL_LENGTH = 60;

/** An id, a number or a hash in a path or a sentence becomes ":id", so equal calls group together. */
export function normalizeSegment(segment: string): string {
  if (NUMBER.test(segment) || UUID.test(segment) || LONG_HEX.test(segment)) {
    return ':id';
  }
  return segment;
}

/** "GET /orders/42" -> "GET /orders/:id"; without a request, the first three words of the message. */
export function operationName(message: string): string {
  const request = message.match(HTTP_REQUEST);
  if (request) {
    return `${request[1]} ${request[2].split('/').map(normalizeSegment).join('/')}`;
  }
  const words = message.trim().split(/\s+/).filter(Boolean).slice(0, 3);
  if (words.length === 0) {
    return UNKNOWN_SERVICE;
  }
  return words.map(normalizeSegment).join(' ').slice(0, MAX_LABEL_LENGTH);
}

interface Totals {
  total: number;
  count: number;
  max: number;
}

type NodeSeed = Pick<FlameNode, 'id' | 'kind' | 'label' | 'serviceIndex'> & Totals;

function makeNode(seed: NodeSeed): FlameNode {
  return { share: 0, mergedOperations: 0, children: [], ...seed };
}

function addSample(totals: Map<string, Totals>, key: string, latency: number): void {
  const current = totals.get(key) ?? { total: 0, count: 0, max: 0 };
  current.total += latency;
  current.count += 1;
  current.max = Math.max(current.max, latency);
  totals.set(key, current);
}

function sumTotals(nodes: Totals[]): Totals {
  return {
    total: nodes.reduce((sum, node) => sum + node.total, 0),
    count: nodes.reduce((sum, node) => sum + node.count, 0),
    max: nodes.reduce((largest, node) => Math.max(largest, node.max), 0),
  };
}

function byTotalThenLabel(first: FlameNode, second: FlameNode): number {
  return second.total - first.total || first.label.localeCompare(second.label);
}

function groupByService(lines: ParsedLine[]): Map<string, Map<string, Totals>> {
  const services = new Map<string, Map<string, Totals>>();
  for (const line of lines) {
    if (line.latencyMs === null || line.latencyMs <= 0) {
      continue;
    }
    const service = line.service ?? UNKNOWN_SERVICE;
    const operations = services.get(service) ?? new Map<string, Totals>();
    addSample(operations, operationName(line.message), line.latencyMs);
    services.set(service, operations);
  }
  return services;
}

/** Keeps the largest operations and folds the rest into one `other` block. */
function mergeSmallOperations(operations: FlameNode[], serviceId: string): FlameNode[] {
  if (operations.length <= MAX_OPERATIONS_PER_SERVICE) {
    return operations;
  }
  const kept = operations.slice(0, MAX_OPERATIONS_PER_SERVICE - 1);
  const tail = operations.slice(MAX_OPERATIONS_PER_SERVICE - 1);
  const other = makeNode({
    id: `other:${serviceId}`,
    kind: 'other',
    label: '',
    serviceIndex: 0,
    ...sumTotals(tail),
  });
  other.mergedOperations = tail.length;
  return [...kept, other];
}

function buildService(service: string, operations: Map<string, Totals>): FlameNode {
  const nodes = [...operations].map(([name, totals]) =>
    makeNode({
      id: `op:${service}\u0000${name}`,
      kind: 'operation',
      label: name,
      serviceIndex: 0,
      ...totals,
    }),
  );
  const node = makeNode({
    id: `svc:${service}`,
    kind: 'service',
    label: service,
    serviceIndex: 0,
    ...sumTotals(nodes),
  });
  node.children = mergeSmallOperations(nodes.sort(byTotalThenLabel), service);
  return node;
}

function numberServices(services: FlameNode[]): void {
  services.forEach((service, index) => {
    service.serviceIndex = index;
    service.children.forEach((operation) => {
      operation.serviceIndex = index;
    });
  });
}

function fillShares(node: FlameNode, wholeTotal: number): void {
  node.share = 0;
  if (wholeTotal > 0) {
    node.share = node.total / wholeTotal;
  }
  node.children.forEach((child) => fillShares(child, wholeTotal));
}

/**
 * root -> service -> operation, weighted by total latency. Lines without a positive latency
 * are ignored; null when no line has one, since there is nothing to draw.
 */
export function buildFlameTree(lines: ParsedLine[]): FlameNode | null {
  const grouped = groupByService(lines);
  if (grouped.size === 0) {
    return null;
  }
  const services = [...grouped]
    .map(([service, operations]) => buildService(service, operations))
    .sort(byTotalThenLabel);
  numberServices(services);
  const root = makeNode({
    id: 'root',
    kind: 'root',
    label: '',
    serviceIndex: -1,
    ...sumTotals(services),
  });
  root.children = services;
  fillShares(root, root.total);
  return root;
}
