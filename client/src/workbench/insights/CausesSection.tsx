import { INSIGHTS_TEXT } from '../../content/workbenchInsights';
import { useText } from '../../i18n/useText';
import { CauseBreakdown } from './CauseBreakdown';
import type { ConfidenceResult } from './confidence';
import { InsightSection } from './InsightSection';

interface CausesSectionProps {
  confidence: ConfidenceResult;
  explanation: string;
}

/** The report's probable causes ranked by heuristic confidence, with the reasoning open to check. */
export function CausesSection({ confidence, explanation }: CausesSectionProps) {
  const text = useText(INSIGHTS_TEXT);
  let content = <CauseRanking confidence={confidence} />;
  if (confidence.causes.length === 0) {
    content = <p className="insights-note">{text.causes.empty}</p>;
  }
  return (
    <InsightSection title={text.sections.causes}>
      {explanation && (
        <p className="insights-lead">
          <span className="evidence-label">{text.causes.lead}</span> {explanation}
        </p>
      )}
      {content}
    </InsightSection>
  );
}

function CauseRanking({ confidence }: { confidence: ConfidenceResult }) {
  const text = useText(INSIGHTS_TEXT).causes;
  const { causes, otherPercent } = confidence;
  return (
    <>
      <p className="insights-note">
        <strong>{text.heuristic}.</strong> {text.heuristicHint}
      </p>
      <ol className="insights-causes" aria-label={text.listLabel}>
        {causes.map((item, position) => (
          <CauseRow
            key={item.index}
            rank={position + 1}
            cause={item.cause}
            percent={item.percent}
          />
        ))}
        {otherPercent > 0 && <CauseRow rank={null} cause={text.other} percent={otherPercent} />}
      </ol>
      <CauseBreakdown causes={causes} />
    </>
  );
}

interface CauseRowProps {
  rank: number | null;
  cause: string;
  percent: number;
}

function CauseRow({ rank, cause, percent }: CauseRowProps) {
  const text = useText(INSIGHTS_TEXT).causes;
  let barLabel = text.percent(percent);
  if (rank !== null) {
    barLabel = text.barLabel(rank, percent);
  }
  return (
    <li className="insights-cause" data-muted={rank === null}>
      <span className="insights-cause-rank" aria-hidden="true">
        {rank ?? '?'}
      </span>
      <p className="insights-cause-text">{cause}</p>
      <span className="insights-cause-percent">{text.percent(percent)}</span>
      <span className="insights-cause-bar" role="img" aria-label={barLabel}>
        <span style={{ width: `${percent}%` }} />
      </span>
    </li>
  );
}
