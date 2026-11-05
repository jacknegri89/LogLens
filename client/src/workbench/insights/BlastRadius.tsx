import { INSIGHTS_TEXT } from '../../content/workbenchInsights';
import { useText } from '../../i18n/useText';
import { InsightSection } from './InsightSection';
import type { Topology } from './topology';
import { TopologyDiagram } from './TopologyDiagram';
import { describeIncident, nodeName } from './topologyNames';

/** Where the incident started and what it reached, as a map and as plain text. */
export function BlastRadius({ topology }: { topology: Topology }) {
  const text = useText(INSIGHTS_TEXT);
  const hasNodes = topology.nodes.length > 0;
  let mapContent = <p className="insights-note">{text.blast.empty}</p>;
  if (hasNodes) {
    mapContent = <MapWithText topology={topology} />;
  }
  return (
    <InsightSection title={text.sections.blast}>
      <p className="insights-note">{text.blast.intro}</p>
      {mapContent}
      {!topology.hasDiagnosis && <p className="insights-note">{text.blast.noDiagnosis}</p>}
      {topology.sparse && hasNodes && <p className="insights-note">{text.blast.sparse}</p>}
    </InsightSection>
  );
}

function MapWithText({ topology }: { topology: Topology }) {
  const text = useText(INSIGHTS_TEXT).blast;
  const names = describeIncident(topology, text.kinds);
  let affectedText = text.nothingAffected;
  if (names.affected.length > 0) {
    affectedText = text.affected(names.affected.join(', '));
  }
  return (
    <>
      {topology.hasDiagnosis && (
        <p className="insights-summary">
          <strong>{text.origin(names.origin.join(', '))}</strong>; {affectedText}
        </p>
      )}
      <TopologyDiagram topology={topology} />
      <MapLegend />
      <ul className="sr-only" aria-label={text.listLabel}>
        {topology.nodes.map((node) => (
          <li key={node.id}>{text.listItem(nodeName(node, text.kinds), text.roles[node.role])}</li>
        ))}
      </ul>
    </>
  );
}

function MapLegend() {
  const text = useText(INSIGHTS_TEXT).blast;
  return (
    <ul className="insights-legend" aria-label={text.legendLabel}>
      {(['origin', 'affected', 'healthy'] as const).map((role) => (
        <li key={role} data-role={role}>
          {text.roles[role]}
        </li>
      ))}
      <li data-role="flow">{text.legendFlow}</li>
    </ul>
  );
}
