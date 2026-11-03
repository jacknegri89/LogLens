import { INSIGHTS_TEXT } from '../../content/workbenchInsights';
import { useText } from '../../i18n/useText';
import { formatMilliseconds, type LatencySummary } from './latency';

const KEYS = ['p50', 'p95', 'p99', 'max'] as const;

/** p50, p95, p99 and the slowest call, as large figures. */
export function LatencyStats({ summary }: { summary: LatencySummary }) {
  const text = useText(INSIGHTS_TEXT).flame;
  return (
    <dl className="insights-stats" aria-label={text.summaryLabel(summary.count)}>
      {KEYS.map((key) => (
        <div key={key}>
          <dt>{text.percentiles[key]}</dt>
          <dd>{formatMilliseconds(summary[key])}</dd>
        </div>
      ))}
    </dl>
  );
}
