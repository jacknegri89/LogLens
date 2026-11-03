import type { Topology, TopologyKind, TopologyNode } from './topology';

/** The name to show for a node: the service's own name, or the label of its kind. */
export function nodeName(node: TopologyNode, kindLabels: Record<TopologyKind, string>): string {
  return node.name ?? kindLabels[node.kind];
}

function namesOf(topology: Topology, ids: string[], kindLabels: Record<TopologyKind, string>) {
  return topology.nodes
    .filter((node) => ids.includes(node.id))
    .map((node) => nodeName(node, kindLabels));
}

/** The labels of the origin and of the affected parts, in the order of the chain. */
export function describeIncident(topology: Topology, kindLabels: Record<TopologyKind, string>) {
  return {
    origin: namesOf(topology, topology.originIds, kindLabels),
    affected: namesOf(topology, topology.affectedIds, kindLabels),
  };
}
