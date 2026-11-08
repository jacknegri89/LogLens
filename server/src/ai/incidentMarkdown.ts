import { incidentText } from '../content/localized';
import type { IncidentText } from '../content/incidentText';
import type { Language } from '../types/language';
import type { CoverageInfo, EngineInfo, IncidentReport, ReportEvidence } from '../types/report';

/**
 * The incident part of the Markdown report (and of the GitHub Issue export). Everything that comes
 * from the log is escaped: a log is untrusted text, and a line like `[click](http://evil)` must not
 * become a link in somebody's issue tracker.
 */

const MAX_TIMELINE_LINES = 15;
const MAX_EVIDENCE_LINES = 6;
const MAX_QUOTE_CHARS = 200;
/** Characters that Markdown or the HTML in it would act on. */
const MARKDOWN_SPECIAL = /[\\`*_[\]()<>!|#]/g;

export function escapeMarkdown(text: string): string {
  return text.replace(/[\r\n]+/g, ' ').replace(MARKDOWN_SPECIAL, (character) => `\\${character}`);
}

function bullets(items: string[]): string[] {
  return items.map((item) => `- ${escapeMarkdown(item)}`);
}

function evidenceLine(reference: ReportEvidence, text: IncidentText): string {
  const quote = reference.quote.slice(0, MAX_QUOTE_CHARS).replace(/`/g, "'");
  return `- ${text.markdown.line} ${reference.lineStart}: \`${quote}\``;
}

function renderIncident(incident: IncidentReport, text: IncidentText): string[] {
  const words = text.markdown;
  const lines: string[] = [
    `### ${incident.id}: ${escapeMarkdown(incident.title)}`,
    `**${words.severity}:** ${incident.severity} (${escapeMarkdown(incident.severityReasons.join('; '))})`,
    '',
    `**${words.rootCause}** — ${text.statusLabel[incident.rootCause.status]}`,
    escapeMarkdown(incident.rootCause.summary),
  ];
  if (incident.rootCause.reasoning !== undefined) {
    lines.push('', escapeMarkdown(incident.rootCause.reasoning));
  }
  lines.push(...bullets(incident.rootCause.contradicting));
  if (incident.rootCause.evidence.length > 0) {
    lines.push('', `**${words.evidence}**`);
    for (const reference of incident.rootCause.evidence.slice(0, MAX_EVIDENCE_LINES)) {
      lines.push(evidenceLine(reference, text));
    }
  }
  lines.push('', `**${words.impact}**`, ...bullets(incident.impact.observed));
  if (incident.impact.potential.length > 0) {
    lines.push(`_${words.potential}:_`, ...bullets(incident.impact.potential));
  }
  if (incident.timeline.length > 0) {
    lines.push('', `**${words.timeline}**`);
    for (const entry of incident.timeline.slice(0, MAX_TIMELINE_LINES)) {
      const time = entry.time ?? '';
      lines.push(
        `- ${time} ${words.line} ${entry.lineStart} [${entry.role}] ${escapeMarkdown(entry.title)}`,
      );
    }
  }
  const sections: [string, string[]][] = [
    [words.immediate, incident.immediateActions],
    [words.permanent, incident.permanentFix],
    [words.preventive, incident.preventiveMeasures],
  ];
  for (const [heading, items] of sections) {
    if (items.length > 0) {
      lines.push('', `**${heading}**`, ...bullets(items));
    }
  }
  return lines;
}

function partialNote(coverage: CoverageInfo, text: IncidentText): string[] {
  if (coverage.complete) {
    return [];
  }
  const limits = coverage.limits
    .map((limit) => `${limit.count} ${text.limit[limit.code] ?? limit.code}`)
    .join(', ');
  const notAnalysed = coverage.notAcquired + coverage.cutByBudget;
  return [text.markdown.partial(notAnalysed, limits)];
}

/**
 * The Markdown of every incident, with the engine used and any partial-analysis warning first.
 * Returns an empty string when there is nothing to say.
 */
export function renderIncidentsMarkdown(
  incidents: IncidentReport[],
  engine: EngineInfo,
  coverage: CoverageInfo,
  language: Language,
): string {
  if (incidents.length === 0) {
    return '';
  }
  const text = incidentText(language);
  const lines: string[] = [
    text.markdown.incidents,
    '',
    text.markdown.engine(engine.used, engine.aiUsed, engine.fallbackReason),
    ...partialNote(coverage, text),
    '',
  ];
  for (const incident of incidents) {
    lines.push(...renderIncident(incident, text), '');
  }
  return lines.join('\n').trimEnd();
}
