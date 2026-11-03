import { INSIGHTS_TEXT } from '../../content/workbenchInsights';
import { useText } from '../../i18n/useText';
import { ROW_HEIGHT } from './FlameBlock';
import type { FlameRect } from './flameLayout';
import { flameLabel } from './flameLabels';
import { formatMilliseconds } from './latency';

const TOOLTIP_WIDTH = 224;

/** The figures of the block under the pointer or the keyboard focus. The accessible name already says them. */
export function FlameTooltip({ rect, width }: { rect: FlameRect; width: number }) {
  const text = useText(INSIGHTS_TEXT).flame;
  const { node } = rect;
  const left = Math.max(0, Math.min(rect.x, width - TOOLTIP_WIDTH));
  return (
    <dl
      aria-hidden="true"
      className="insights-tooltip"
      style={{ left, top: (rect.depth + 1) * ROW_HEIGHT + 4, width: TOOLTIP_WIDTH }}
    >
      <dt className="insights-tooltip-title">{flameLabel(node, text)}</dt>
      <dd>
        {text.tooltip.total} <strong>{formatMilliseconds(node.total)}</strong>
      </dd>
      <dd>
        {text.tooltip.count} <strong>{node.count}</strong>
      </dd>
      <dd>
        {text.tooltip.max} <strong>{formatMilliseconds(node.max)}</strong>
      </dd>
      <dd>
        {text.tooltip.share} <strong>{text.sharePercent(node.share)}</strong>
      </dd>
    </dl>
  );
}
