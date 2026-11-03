import { useMemo, useState, type KeyboardEvent } from 'react';

import { INSIGHTS_TEXT } from '../../content/workbenchInsights';
import { useText } from '../../i18n/useText';
import { FlameBlock, ROW_HEIGHT } from './FlameBlock';
import { FlameTooltip } from './FlameTooltip';
import { findFlameNode, layoutFlame, type FlameRect } from './flameLayout';
import { flameLabel } from './flameLabels';
import type { FlameNode } from './flamegraph';
import { useElementWidth } from './useElementWidth';

const ROOT_ID = 'root';

/** Stacked rows of blocks as wide as the time they took; click zooms in, Escape zooms out. */
export function FlameChart({ tree }: { tree: FlameNode }) {
  const [zoomId, setZoomId] = useState(ROOT_ID);
  const [hovered, setHovered] = useState<FlameRect | null>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const width = useElementWidth(container);
  const top = findFlameNode(tree, zoomId) ?? tree;
  const rects = useMemo(() => layoutFlame(top, width), [top, width]);
  const height = (Math.max(...rects.map((rect) => rect.depth)) + 1) * ROW_HEIGHT;
  const zoomTo = (id: string) => {
    setHovered(null);
    setZoomId(id);
  };
  const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && zoomTo(ROOT_ID);

  return (
    <div className="insights-flame" onKeyDown={onKeyDown}>
      {top !== tree && <ZoomBar top={top} onReset={() => zoomTo(ROOT_ID)} />}
      <div ref={setContainer} className="insights-flame-canvas" style={{ height }}>
        {width > 0 && (
          <FlameSvg rects={rects} top={top} height={height} onZoom={zoomTo} onHover={setHovered} />
        )}
        {hovered && <FlameTooltip rect={hovered} width={width} />}
      </div>
    </div>
  );
}

function ZoomBar({ top, onReset }: { top: FlameNode; onReset: () => void }) {
  const text = useText(INSIGHTS_TEXT).flame;
  return (
    <p className="insights-flame-bar">
      <span>{text.zoomed(flameLabel(top, text))}</span>
      <button type="button" className="btn-paper insights-small-button" onClick={onReset}>
        {text.reset}
      </button>
    </p>
  );
}

interface FlameSvgProps {
  rects: FlameRect[];
  top: FlameNode;
  height: number;
  onZoom: (id: string) => void;
  onHover: (rect: FlameRect | null) => void;
}

function FlameSvg({ rects, top, height, onZoom, onHover }: FlameSvgProps) {
  const text = useText(INSIGHTS_TEXT).flame;
  return (
    <svg role="group" aria-label={text.chartLabel} width="100%" height={height}>
      {rects.map((rect) => (
        <FlameBlock
          key={rect.node.id}
          rect={rect}
          isTop={rect.node === top}
          onZoom={onZoom}
          onHover={onHover}
        />
      ))}
    </svg>
  );
}
