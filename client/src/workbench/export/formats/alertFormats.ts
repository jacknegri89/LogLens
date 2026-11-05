import type { AnalysisRecord, Severity } from '../../../lib/types';
import { countFaultLines, type ExportInput, type ExportTexts } from './exportTypes';

const PAGERDUTY_SEVERITY: Record<Severity, 'critical' | 'error' | 'warning' | 'info'> = {
  critical: 'critical',
  high: 'error',
  medium: 'warning',
  low: 'info',
  informational: 'info',
};

const PAGERDUTY_SUMMARY_LIMIT = 1024;
const EVIDENCE_LIMIT = 300;
const DETAIL_ITEMS = 5;

/** What the alert shows as proof: the first key line, else the first finding's evidence. */
export function topEvidence(record: AnalysisRecord): string {
  return record.report.keyLines[0] ?? record.report.findings?.[0]?.evidence ?? '';
}

// Slack reads &, < and > as markup; a backtick would end the code span early.
function slackSafe(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text: string, limit: number): string {
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, limit - 1)}…`;
}

/** A Slack message in mrkdwn: severity word, title, impact, the best evidence line and a link placeholder. */
export function buildSlackMessage(
  input: ExportInput & { record: AnalysisRecord },
  texts: ExportTexts,
): string {
  const { record, lines } = input;
  const labels = texts.alert;
  const impact = labels.impact(countFaultLines(lines), lines.length, slackSafe(record.category));
  const evidence = truncate(slackSafe(topEvidence(record)), EVIDENCE_LIMIT);
  return [
    `*[${labels.severity[record.severity]}] ${slackSafe(record.title)}*`,
    `*${labels.impactLabel}:* ${impact}`,
    evidence && `*${labels.evidenceLabel}:* \`${evidence}\``,
    `*${labels.reportLabel}:* <${labels.linkPlaceholder}>`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** A PagerDuty Events API v2 "trigger" event; the routing key is a placeholder to fill in. */
export function buildPagerDutyPayload(input: ExportInput & { record: AnalysisRecord }): string {
  const { record, lines, fileName } = input;
  const { report } = record;
  const payload = {
    routing_key: '<ROUTING_KEY>',
    event_action: 'trigger',
    payload: {
      summary: truncate(record.title, PAGERDUTY_SUMMARY_LIMIT),
      source: fileName ?? 'loglens-workbench',
      severity: PAGERDUTY_SEVERITY[record.severity],
      timestamp: record.createdAt,
      group: record.category,
      class: 'log-analysis',
      custom_details: {
        loglens_severity: record.severity,
        category: record.category,
        fault_lines: countFaultLines(lines),
        total_lines: lines.length,
        key_lines: report.keyLines.slice(0, DETAIL_ITEMS),
        probable_causes: report.causes.slice(0, DETAIL_ITEMS),
        debug_steps: report.debugSteps.slice(0, DETAIL_ITEMS),
      },
    },
    client: 'LogLens',
  };
  return JSON.stringify(payload, null, 2);
}
