import { describe, expect, it } from 'vitest';

import type { Topology, TopologyKind, TopologyNode } from './topology';
import { layoutTopology } from './topologyLayout';

const TIERS: Record<TopologyKind, number> = {
  loadBalancer: 0,
  api: 1,
  service: 2,
  database: 3,
  cache: 3,
  queue: 3,
  external: 3,
};

function node(kind: TopologyKind): TopologyNode {
  return { id: kind, kind, name: null, tier: TIERS[kind], role: 'healthy' };
}

function topologyOf(kinds: TopologyKind[]): Topology {
  const nodes = kinds.map(node);
  const edges = nodes.slice(1).map((next, index) => ({
    from: nodes[index].id,
    to: next.id,
    propagating: false,
  }));
  return { nodes, edges, originIds: [], affectedIds: [], hasDiagnosis: false, sparse: false };
}

const CHAIN: TopologyKind[] = ['loadBalancer', 'api', 'service', 'database'];

describe('layoutTopology', () => {
  it('places each tier in its own column, left to right, on a wide screen', () => {
    const layout = layoutTopology(topologyOf(CHAIN), 'horizontal');
    const xs = layout.nodes.map((placed) => placed.x);

    expect(xs).toEqual([...xs].sort((first, second) => first - second));
    expect(new Set(xs).size).toBe(4);
    expect(layout.edges.map((edge) => edge.path.startsWith('M '))).toEqual([true, true, true]);
  });

  it('places each tier in its own row, top to bottom, on a phone', () => {
    const layout = layoutTopology(topologyOf(CHAIN), 'vertical');
    const ys = layout.nodes.map((placed) => placed.y);

    expect(ys).toEqual([...ys].sort((first, second) => first - second));
    expect(new Set(ys).size).toBe(4);
    expect(layout.width).toBeLessThanOrEqual(360);
  });

  it('stacks the nodes of one tier without overlap', () => {
    const layout = layoutTopology(topologyOf(['api', 'database', 'cache', 'queue']), 'horizontal');
    const column = layout.nodes.filter((placed) => placed.node.tier === 3);
    const tops = column.map((placed) => placed.y).sort((first, second) => first - second);

    expect(tops[1] - tops[0]).toBeGreaterThanOrEqual(layout.nodeHeight);
    expect(layout.height).toBeGreaterThan(tops[2] + layout.nodeHeight - 1);
  });

  it('wraps a crowded tier into more rows on a phone and keeps every node inside the view', () => {
    const layout = layoutTopology(
      topologyOf(['api', 'database', 'cache', 'queue', 'external']),
      'vertical',
    );

    expect(new Set(layout.nodes.map((placed) => placed.y)).size).toBe(3);
    layout.nodes.forEach((placed) => {
      expect(placed.x).toBeGreaterThanOrEqual(0);
      expect(placed.x + layout.nodeWidth).toBeLessThanOrEqual(layout.width);
    });
  });

  it('draws an edge that goes back against the layers from the near side of the first node', () => {
    const topology = topologyOf(['api', 'database']);
    topology.edges = [{ from: 'database', to: 'api', propagating: true }];
    const layout = layoutTopology(topology, 'horizontal');
    const database = layout.nodes.find((placed) => placed.node.id === 'database')!;

    expect(layout.edges[0].path.startsWith(`M ${database.x} `)).toBe(true);
  });

  it('returns an empty layout for no nodes', () => {
    expect(layoutTopology(topologyOf([]), 'horizontal')).toMatchObject({
      width: 0,
      height: 0,
      nodes: [],
      edges: [],
    });
  });
});
