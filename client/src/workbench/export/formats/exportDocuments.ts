import type { AnalysisRecord } from '../../../lib/types';
import { buildPagerDutyPayload, buildSlackMessage } from './alertFormats';
import {
  type ExportDocument,
  type ExportFormatId,
  type ExportInput,
  type ExportTexts,
} from './exportTypes';
import { buildPostMortem } from './postMortem';
import { buildStructuredJson } from './structuredJson';

/** Only the JSON export can be made without an analysis. */
export function formatNeedsAnalysis(format: ExportFormatId): boolean {
  return format !== 'json';
}

/** A file name made of safe characters only, whatever the id or file name it comes from. */
export function safeFileStem(text: string | null, fallback: string): string {
  const stem = (text ?? '').replace(/\.[A-Za-z0-9]{1,5}$/, '').replace(/[^A-Za-z0-9_-]+/g, '-');
  return stem.replace(/^-+|-+$/g, '').slice(0, 60) || fallback;
}

function documentFor(
  id: ExportDocument['id'],
  stem: string,
  extension: string,
  mimeType: string,
  content: string,
): ExportDocument {
  return { id, filename: `${stem}.${extension}`, mimeType, content };
}

type WithRecord = ExportInput & { record: AnalysisRecord };

const MARKDOWN = 'text/markdown;charset=utf-8';
const PLAIN = 'text/plain;charset=utf-8';

function recordDocuments(
  format: ExportFormatId,
  input: WithRecord,
  stem: string,
  texts: ExportTexts,
): ExportDocument[] {
  if (format === 'github') {
    const issue = input.record.report.bugReportMarkdown;
    return [documentFor('github', `${stem}-issue`, 'md', MARKDOWN, issue)];
  }
  if (format === 'postmortem') {
    const report = buildPostMortem(input, texts);
    return [documentFor('postmortem', `${stem}-postmortem`, 'md', MARKDOWN, report)];
  }
  return [
    documentFor('slack', `${stem}-slack`, 'txt', PLAIN, buildSlackMessage(input, texts)),
    documentFor(
      'pagerduty',
      `${stem}-pagerduty`,
      'json',
      'application/json',
      buildPagerDutyPayload(input),
    ),
  ];
}

/** The documents of a format: usually one, two for the alert format. Empty when the analysis is missing. */
export function buildExportDocuments(
  format: ExportFormatId,
  input: ExportInput,
  texts: ExportTexts,
): ExportDocument[] {
  const stem = `loglens-${safeFileStem(input.record?.id ?? input.fileName, 'log')}`;
  if (format === 'json') {
    return [documentFor('json', stem, 'json', 'application/json', buildStructuredJson(input))];
  }
  return input.record
    ? recordDocuments(format, { ...input, record: input.record }, stem, texts)
    : [];
}
