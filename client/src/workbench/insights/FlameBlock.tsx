import type { KeyboardEvent } from 'react';

import { INSIGHTS_TEXT } from '../../content/workbenchInsights';
import { useText } from '../../i18n/useText';
import { fitLabel, type FlameRect } from './flameLayout';
import { describeFlameNode, flameLabel } from './flameLabels';

export const ROW_HEIGHT = 32;
const CHARACTER_WIDTH = 7.4;
const HUE_COUNT = 6;

interface FlameBlockProps {
  rect: FlameRect;
  /** The block that is already shown full width: clicking it has nothing left to zoom into. */
  isTop: boolean;
  onZoom: (id: string) => void;
  onHover: (rect: FlameRect | null) => void;
}

/** One block of the flamegraph, a focusable button that zooms into its own subtree. */
export function FlameBlock({ rect, isTop, onZoom, onHover }: FlameBlockProps) {
  const text = useText(INSIGHTS_TEXT).flame;
  const { node } = rect;
  const description = describeFlameNode(node, text);
  const zoom = () => !isTop && onZoom(node.id);
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    zoom();
  };

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={description}
      transform={`translate(${rect.x} ${rect.depth * ROW_HEIGHT})`}
      className={`insights-flame-block insights-flame-hue-${hueOf(node.serviceIndex)}`}
      onClick={zoom}
      onKeyDown={onKeyDown}
      onMouseEnter={() => onHover(rect)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(rect)}
      onBlur={() => onHover(null)}
    >
      <rect width={Math.max(rect.width - 1, 1)} height={ROW_HEIGHT - 2} />
      <text x="6" y={ROW_HEIGHT / 2 + 3}>
        {fitLabel(flameLabel(node, text), rect.width, CHARACTER_WIDTH)}
      </text>
    </g>
  );
}

function hueOf(serviceIndex: number): string {
  return serviceIndex < 0 ? 'root' : String(serviceIndex % HUE_COUNT);
}
