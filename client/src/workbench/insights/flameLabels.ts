import type { TextOf } from '../../i18n/defineText';
import { INSIGHTS_TEXT } from '../../content/workbenchInsights';
import type { FlameNode } from './flamegraph';
import { UNKNOWN_SERVICE } from './flamegraph';
import { formatMilliseconds } from './latency';

export type FlameText = TextOf<typeof INSIGHTS_TEXT>['flame'];

/** The words to show for a block: names come from the log, the root and merged blocks from the text. */
export function flameLabel(node: FlameNode, text: FlameText): string {
  if (node.kind === 'root') {
    return text.allRequests;
  }
  if (node.kind === 'other') {
    return text.otherOperations(node.mergedOperations);
  }
  if (node.kind === 'service' && node.label === UNKNOWN_SERVICE) {
    return text.unknownService;
  }
  return node.label;
}

/** One sentence with every figure of a block: the accessible name and the native tooltip. */
export function describeFlameNode(node: FlameNode, text: FlameText): string {
  const { tooltip } = text;
  return [
    flameLabel(node, text),
    `${tooltip.total} ${formatMilliseconds(node.total)}`,
    `${tooltip.count} ${node.count}`,
    `${tooltip.max} ${formatMilliseconds(node.max)}`,
    `${tooltip.share} ${text.sharePercent(node.share)}`,
  ].join(', ');
}
