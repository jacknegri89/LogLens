import { isLanguage, type Language } from '../../../i18n/languages';
import type { AnalysisReport, Finding, Severity, TimelineEntry } from '../../../lib/types';
import { PermalinkError } from './permalinkError';

/** The report of an analysis, as it travels in a link (no raw log: the log is its own field). */
export interface SharedReport {
  title: string;
  severity: Severity;
  category: string;
  report: AnalysisReport;
}

/** Everything a share link carries. */
export interface PermalinkState {
  v: 1;
  language: Language;
  log: string;
  report?: SharedReport;
}

export const PERMALINK_LIMITS = {
  logCharacters: 20_000_000,
  textCharacters: 400_000,
  listItems: 2000,
};

const SEVERITIES: readonly Severity[] = ['informational', 'low', 'medium', 'high', 'critical'];
const ROLES: readonly TimelineEntry['role'][] = ['root', 'effect', 'independent'];

function invalid(): never {
  throw new PermalinkError('invalid');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : invalid();
}

function readText(value: unknown, limit = PERMALINK_LIMITS.textCharacters): string {
  return typeof value === 'string' && value.length <= limit ? value : invalid();
}

function readOptionalText(value: unknown): string | undefined {
  return value === undefined ? undefined : readText(value);
}

function readList<T>(value: unknown, readItem: (item: unknown) => T): T[] {
  if (!Array.isArray(value) || value.length > PERMALINK_LIMITS.listItems) return invalid();
  // Not `map(readItem)`: map would pass the position as a second argument.
  return value.map((item) => readItem(item));
}

function readOptionalList<T>(value: unknown, readItem: (item: unknown) => T): T[] | undefined {
  return value === undefined ? undefined : readList(value, readItem);
}

function readOneOf<T extends string>(value: unknown, allowed: readonly T[]): T {
  return allowed.find((candidate) => candidate === value) ?? invalid();
}

function readFinding(value: unknown): Finding {
  const item = readRecord(value);
  const finding: Finding = {
    title: readText(item.title),
    severity: readOneOf(item.severity, SEVERITIES),
    category: readText(item.category),
    evidence: readText(item.evidence),
  };
  const technique = readOptionalText(item.technique);
  const owasp = readOptionalText(item.owasp);
  return { ...finding, ...(technique && { technique }), ...(owasp && { owasp }) };
}

function readCausedBy(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const inRange =
    Number.isInteger(value) &&
    (value as number) >= 0 &&
    (value as number) < PERMALINK_LIMITS.listItems;
  return inRange ? (value as number) : invalid();
}

function readTimelineEntry(value: unknown): TimelineEntry {
  const item = readRecord(value);
  const time = readOptionalText(item.time);
  const causedBy = readCausedBy(item.causedBy);
  return {
    title: readText(item.title),
    category: readText(item.category),
    severity: readOneOf(item.severity, SEVERITIES),
    role: readOneOf(item.role, ROLES),
    evidence: readText(item.evidence),
    ...(time !== undefined && { time }),
    ...(causedBy !== undefined && { causedBy }),
  };
}

function readAnalysisReport(value: unknown): AnalysisReport {
  const item = readRecord(value);
  const format = readOptionalText(item.format);
  const findings = readOptionalList(item.findings, readFinding);
  const overview = readOptionalList(item.overview, readText);
  const timeline = readOptionalList(item.timeline, readTimelineEntry);
  return {
    keyLines: readList(item.keyLines, readText),
    causes: readList(item.causes, readText),
    debugSteps: readList(item.debugSteps, readText),
    bugReportMarkdown: readText(item.bugReportMarkdown),
    ...(format !== undefined && { format }),
    ...(findings && { findings }),
    ...(overview && { overview }),
    ...(timeline && { timeline }),
  };
}

function readSharedReport(value: unknown): SharedReport {
  const item = readRecord(value);
  return {
    title: readText(item.title),
    severity: readOneOf(item.severity, SEVERITIES),
    category: readText(item.category),
    report: readAnalysisReport(item.report),
  };
}

/** Checks parsed JSON by hand and copies out only the known fields; anything else throws `invalid`. */
export function validatePermalinkState(value: unknown): PermalinkState {
  const item = readRecord(value);
  if (item.v !== 1) return invalid();
  const language = isLanguage(item.language) ? item.language : invalid();
  const log = readText(item.log, PERMALINK_LIMITS.logCharacters);
  return item.report === undefined
    ? { v: 1, language, log }
    : { v: 1, language, log, report: readSharedReport(item.report) };
}
