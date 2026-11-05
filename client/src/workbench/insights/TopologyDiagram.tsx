import { useId, useMemo, useState } from 'react';

import { INSIGHTS_TEXT } from '../../content/workbenchInsights';
import { useText } from '../../i18n/useText';
import { fitLabel } from './flameLayout';
import type { Topology } from './topology';
import {
  layoutTopology,
  type Orientation,
  type PlacedNode,
  type TopologyLayout,
} from './topologyLayout';
import { nodeName } from './topologyNames';
import { useElementWidth } from './useElementWidth';

/** Below this width the map stacks top to bottom, so it fits a phone without shrinking its text. */
const SIDE_BY_SIDE_MIN_WIDTH = 640;
const CHARACTER_WIDTH = 7.4;

/** The system map as an SVG that reads left to right on wide screens and top to bottom on phones. */
export function TopologyDiagram({ topology }: { topology: Topology }) {
  const text = useText(INSIGHTS_TEXT).blast;
  const markerId = useId().replace(/:/g, '');
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const width = useElementWidth(container);
  let orientation: Orientation = 'vertical';
  if (width >= SIDE_BY_SIDE_MIN_WIDTH) {
    orientation = 'horizontal';
  }
  const layout = useMemo(() => layoutTopology(topology, orientation), [topology, orientation]);

  return (
    <div ref={setContainer} className="insights-map">
      {width > 0 && (
        <svg
          role="img"
          aria-label={text.chartLabel}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          style={{ maxWidth: layout.width }}
        >
          <ArrowMarkers markerId={markerId} />
          <MapEdges layout={layout} markerId={markerId} />
          {layout.nodes.map((placed) => (
            <MapNode key={placed.node.id} placed={placed} layout={layout} />
          ))}
        </svg>
      )}
    </div>
  );
}

function ArrowMarkers({ markerId }: { markerId: string }) {
  return (
    <defs>
      {(['still', 'flow'] as const).map((kind) => (
        <marker
          key={kind}
          id={`${markerId}-${kind}`}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerUnits="userSpaceOnUse"
          markerWidth="11"
          markerHeight="11"
          orient="auto"
          className={`insights-arrow insights-arrow-${kind}`}
        >
          <path d="M 0 0 L 10 5 L 0 10 z" />
        </marker>
      ))}
    </defs>
  );
}

function MapEdges({ layout, markerId }: { layout: TopologyLayout; markerId: string }) {
  return (
    <g fill="none">
      {layout.edges.map((edge) => {
        let marker = 'still';
        if (edge.propagating) {
          marker = 'flow';
        }
        return (
          <path
            key={`${edge.from}>${edge.to}`}
            d={edge.path}
            className="insights-edge"
            data-flow={edge.propagating}
            markerEnd={`url(#${markerId}-${marker})`}
          />
        );
      })}
    </g>
  );
}

function MapNode({ placed, layout }: { placed: PlacedNode; layout: TopologyLayout }) {
  const text = useText(INSIGHTS_TEXT).blast;
  const { node } = placed;
  const label = fitLabel(nodeName(node, text.kinds), layout.nodeWidth, CHARACTER_WIDTH);
  const centerX = layout.nodeWidth / 2;
  return (
    <g
      transform={`translate(${placed.x} ${placed.y})`}
      className="insights-node"
      data-role={node.role}
    >
      <rect width={layout.nodeWidth} height={layout.nodeHeight} rx="3" />
      <text x={centerX} y={layout.nodeHeight / 2 - 3} textAnchor="middle">
        {label}
      </text>
      <text
        x={centerX}
        y={layout.nodeHeight / 2 + 14}
        textAnchor="middle"
        className="insights-node-role"
      >
        {text.roles[node.role]}
      </text>
    </g>
  );
}
