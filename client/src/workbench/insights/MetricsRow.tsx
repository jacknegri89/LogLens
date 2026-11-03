import { REPORT_TEXT } from '../../content/report';
import { INSIGHTS_TEXT } from '../../content/workbenchInsights';
import { useText } from '../../i18n/useText';
import { SeverityBadge } from '../../components/SeverityBadge';
import { InsightSection } from './InsightSection';
import { RiskBreakdown } from './RiskBreakdown';
import { RiskGauge } from './RiskGauge';
import type { ReportInsights } from './useInsightsModel';

/** Severity, anomaly risk and the repair-time estimate side by side. */
export function MetricsRow({ report }: { report: ReportInsights }) {
  const text = useText(INSIGHTS_TEXT);
  return (
    <InsightSection title={text.sections.metrics}>
      <div className="insights-metrics">
        <SeverityCard report={report} />
        <RiskCard report={report} />
        <MttrCard report={report} />
      </div>
    </InsightSection>
  );
}

function SeverityCard({ report }: { report: ReportInsights }) {
  const text = useText(INSIGHTS_TEXT);
  return (
    <div className="insights-metric evidence-sheet">
      <p className="insights-metric-title">{text.severityTitle}</p>
      <div className="insights-severity">
        <SeverityBadge severity={report.severity} />
      </div>
      <p className="insights-metric-note">{report.title}</p>
    </div>
  );
}

function RiskCard({ report }: { report: ReportInsights }) {
  const text = useText(INSIGHTS_TEXT).risk;
  const severityLabel = useText(REPORT_TEXT).severityLabels[report.severity];
  const { score, level } = report.risk;
  return (
    <div className="insights-metric evidence-sheet">
      <p className="insights-metric-title">{text.title}</p>
      <div
        role="meter"
        aria-label={text.title}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        aria-valuetext={text.meterLabel(score, text.levels[level])}
      >
        <RiskGauge score={score} level={level} />
        <p className="insights-gauge-level" data-level={level}>
          {text.levels[level]} <span>{text.outOf}</span>
        </p>
      </div>
      <RiskBreakdown risk={report.risk} severityLabel={severityLabel} />
    </div>
  );
}

function MttrCard({ report }: { report: ReportInsights }) {
  const text = useText(INSIGHTS_TEXT).mttr;
  const severityLabel = useText(REPORT_TEXT).severityLabels[report.severity];
  return (
    <div className="insights-metric evidence-sheet">
      <p className="insights-metric-title">
        {text.title} <span className="evidence-tag">{text.estimate}</span>
      </p>
      <p className="insights-mttr">{text.range(report.mttr.min, report.mttr.max)}</p>
      <p className="insights-metric-note">{text.basis(report.category, severityLabel)}</p>
      <p className="insights-metric-note">{text.note}</p>
    </div>
  );
}
