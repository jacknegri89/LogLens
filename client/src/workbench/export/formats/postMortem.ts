import type { AnalysisRecord, TimelineEntry } from '../../../lib/types';
import { topEvidence } from './alertFormats';
import { countFaultLines, type ExportInput, type ExportTexts } from './exportTypes';

type PostMortemTexts = ExportTexts['postmortem'];

// Log text goes inside code spans only after its backticks and line breaks are gone.
function inlineCode(text: string): string {
  return `\`${text.replace(/`/g, "'").replace(/\s+/g, ' ').trim()}\``;
}

function plain(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function bullets(items: readonly string[]): string {
  return items.map((item) => `- ${item}`).join('\n');
}

function timelineLine(entry: TimelineEntry, texts: PostMortemTexts): string {
  const time = entry.time ? plain(entry.time) : texts.noTime;
  return `- **${time}** ${plain(entry.title)} (${texts.roles[entry.role]}) ${inlineCode(entry.evidence)}`;
}

function timelineSection(record: AnalysisRecord, texts: PostMortemTexts): string {
  const { timeline, overview, keyLines } = record.report;
  if (timeline && timeline.length > 0)
    return timeline.map((entry) => timelineLine(entry, texts)).join('\n');
  if (overview && overview.length > 0) return bullets(overview.map(plain));
  return bullets(keyLines.map(inlineCode));
}

function rootCauseSection(record: AnalysisRecord, texts: PostMortemTexts): string {
  const roots = (record.report.timeline ?? []).filter((entry) => entry.role === 'root');
  const causes =
    record.report.causes.length > 0 ? record.report.causes : roots.map((entry) => entry.title);
  return causes.length > 0 ? bullets(causes.map(plain)) : texts.rootCauseUnknown;
}

function actionItems(record: AnalysisRecord, texts: PostMortemTexts): string {
  const items = [...record.report.debugSteps.map(plain), ...texts.defaultActions];
  return items.map((item) => `- [ ] ${item}`).join('\n');
}

function header(record: AnalysisRecord, texts: PostMortemTexts): string {
  return [
    `# ${texts.heading}: ${plain(record.title)}`,
    '',
    `- ${texts.date}: ${record.createdAt.slice(0, 10)}`,
    `- ${texts.severity}: ${record.severity}`,
    `- ${texts.category}: ${plain(record.category)}`,
  ].join('\n');
}

function summary(record: AnalysisRecord): string {
  const first = record.report.overview?.[0] ?? topEvidence(record);
  return first ? plain(first) : plain(record.title);
}

function section(heading: string, body: string): string {
  return `## ${heading}\n\n${body}`;
}

/** An executive post-mortem in Markdown, filled from the report; what the report cannot know is left to write. */
export function buildPostMortem(
  input: ExportInput & { record: AnalysisRecord },
  texts: ExportTexts,
): string {
  const { record, lines } = input;
  const words = texts.postmortem;
  const findings = record.report.findings?.length ?? 1;
  const sections = [
    header(record, words),
    section(words.summary, summary(record)),
    section(words.impact, words.impactText(countFaultLines(lines), lines.length, findings)),
    section(words.timeline, timelineSection(record, words)),
    section(words.rootCause, rootCauseSection(record, words)),
    section(
      words.resolution,
      record.report.debugSteps.length > 0
        ? bullets(record.report.debugSteps.map(plain))
        : words.resolutionUnknown,
    ),
    section(words.actionItems, actionItems(record, words)),
    section(words.lessons, bullets(words.lessonPrompts)),
  ];
  return `${sections.join('\n\n')}\n`;
}
