import type { Topology, TopologyNode } from './topology';

export type Orientation = 'horizontal' | 'vertical';

export interface PlacedNode {
  node: TopologyNode;
  x: number;
  y: number;
}

export interface PlacedEdge {
  from: string;
  to: string;
  propagating: boolean;
  /** SVG path from the edge of one node to the edge of the other. */
  path: string;
}

export interface TopologyLayout {
  width: number;
  height: number;
  nodeWidth: number;
  nodeHeight: number;
  nodes: PlacedNode[];
  edges: PlacedEdge[];
}

interface Metrics {
  nodeWidth: number;
  nodeHeight: number;
  gapAcross: number;
  gapAlong: number;
  margin: number;
  /** Nodes of one tier per row on a narrow screen before the tier wraps. */
  perRow: number;
}

const METRICS: Record<Orientation, Metrics> = {
  horizontal: {
    nodeWidth: 132,
    nodeHeight: 52,
    gapAcross: 60,
    gapAlong: 16,
    margin: 16,
    perRow: 99,
  },
  vertical: { nodeWidth: 100, nodeHeight: 52, gapAcross: 12, gapAlong: 40, margin: 12, perRow: 3 },
};

function groupByTier(nodes: TopologyNode[]): TopologyNode[][] {
  const tiers = [...new Set(nodes.map((node) => node.tier))].sort(
    (first, second) => first - second,
  );
  return tiers.map((tier) => nodes.filter((node) => node.tier === tier));
}

function placeHorizontal(groups: TopologyNode[][], metrics: Metrics): PlacedNode[] {
  const tallest = Math.max(...groups.map((group) => group.length));
  const step = metrics.nodeHeight + metrics.gapAlong;
  return groups.flatMap((group, column) =>
    group.map((node, row) => ({
      node,
      x: metrics.margin + column * (metrics.nodeWidth + metrics.gapAcross),
      y: metrics.margin + ((tallest - group.length) * step) / 2 + row * step,
    })),
  );
}

function placeVertical(groups: TopologyNode[][], metrics: Metrics): PlacedNode[] {
  const fullWidth = metrics.perRow * metrics.nodeWidth + (metrics.perRow - 1) * metrics.gapAcross;
  const placed: PlacedNode[] = [];
  let rowIndex = 0;
  for (const group of groups) {
    for (let start = 0; start < group.length; start += metrics.perRow) {
      const rowNodes = group.slice(start, start + metrics.perRow);
      const rowWidth =
        rowNodes.length * metrics.nodeWidth + (rowNodes.length - 1) * metrics.gapAcross;
      rowNodes.forEach((node, column) => {
        placed.push({
          node,
          x:
            metrics.margin +
            (fullWidth - rowWidth) / 2 +
            column * (metrics.nodeWidth + metrics.gapAcross),
          y: metrics.margin + rowIndex * (metrics.nodeHeight + metrics.gapAlong),
        });
      });
      rowIndex += 1;
    }
  }
  return placed;
}

function curve(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  axis: Orientation,
): string {
  let middle = `${startX} ${(startY + endY) / 2} ${endX} ${(startY + endY) / 2}`;
  if (axis === 'horizontal') {
    middle = `${(startX + endX) / 2} ${startY} ${(startX + endX) / 2} ${endY}`;
  }
  return `M ${startX} ${startY} C ${middle} ${endX} ${endY}`;
}

/** Leaves the side of `from` that faces `to` and arrives at the side of `to` that faces `from`. */
function connect(from: PlacedNode, to: PlacedNode, metrics: Metrics, axis: Orientation): string {
  const { nodeWidth: width, nodeHeight: height } = metrics;
  if (axis === 'horizontal') {
    const forward = to.x >= from.x;
    let fromOffset = 0;
    let toOffset = width;
    if (forward) {
      fromOffset = width;
      toOffset = 0;
    }
    return curve(
      from.x + fromOffset,
      from.y + height / 2,
      to.x + toOffset,
      to.y + height / 2,
      axis,
    );
  }
  const down = to.y >= from.y;
  let fromOffset = 0;
  let toOffset = height;
  if (down) {
    fromOffset = height;
    toOffset = 0;
  }
  return curve(from.x + width / 2, from.y + fromOffset, to.x + width / 2, to.y + toOffset, axis);
}

/** Positions every node and edge. Wide screens read left to right, phones top to bottom. */
export function layoutTopology(topology: Topology, orientation: Orientation): TopologyLayout {
  const metrics = METRICS[orientation];
  const empty = {
    width: 0,
    height: 0,
    nodeWidth: metrics.nodeWidth,
    nodeHeight: metrics.nodeHeight,
  };
  if (topology.nodes.length === 0) {
    return { ...empty, nodes: [], edges: [] };
  }
  const groups = groupByTier(topology.nodes);
  let nodes: PlacedNode[];
  if (orientation === 'horizontal') {
    nodes = placeHorizontal(groups, metrics);
  } else {
    nodes = placeVertical(groups, metrics);
  }
  const byId = new Map(nodes.map((placed) => [placed.node.id, placed]));
  const edges = topology.edges.map((edge) => ({
    ...edge,
    path: connect(byId.get(edge.from)!, byId.get(edge.to)!, metrics, orientation),
  }));
  const right = Math.max(...nodes.map((placed) => placed.x)) + metrics.nodeWidth + metrics.margin;
  const bottom = Math.max(...nodes.map((placed) => placed.y)) + metrics.nodeHeight + metrics.margin;
  return { ...empty, width: right, height: bottom, nodes, edges };
}
