import type {
  AnalysisReport,
  CoverageInfo,
  EngineInfo,
  Finding,
  IncidentReport,
  InjectionAttempt,
  TimelineEntry,
  ValidationInfo,
} from '../types/report';

/**
 * The report column is JSON written by older and newer versions of the server. Reading it must
 * never crash a request: a damaged row, a report from before the incidents existed or a field of
 * the wrong type gives a smaller report, not an error. Only the shape is checked here; the text
 * is not changed.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
}

function objectList(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isPlainObject);
}

/** An incident the screen can draw: it has an id, a root cause with a list of evidence and a timeline. */
function isDrawableIncident(item: Record<string, unknown>): boolean {
  const rootCause = item.rootCause;
  if (typeof item.id !== 'string' || !isPlainObject(rootCause)) {
    return false;
  }
  return Array.isArray(rootCause.evidence) && Array.isArray(item.timeline);
}

export function emptyReport(): AnalysisReport {
  return { keyLines: [], causes: [], debugSteps: [], bugReportMarkdown: '' };
}

/** The stored report as a safe object. Anything unreadable becomes an empty report. */
export function parseStoredReport(json: string): AnalysisReport {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return emptyReport();
  }
  if (!isPlainObject(data)) {
    return emptyReport();
  }
  const report = emptyReport();
  report.keyLines = stringList(data.keyLines);
  report.causes = stringList(data.causes);
  report.debugSteps = stringList(data.debugSteps);
  if (typeof data.bugReportMarkdown === 'string') {
    report.bugReportMarkdown = data.bugReportMarkdown;
  }
  if (typeof data.format === 'string') {
    report.format = data.format;
  }
  if (Array.isArray(data.findings)) {
    report.findings = objectList(data.findings) as unknown as Finding[];
  }
  if (Array.isArray(data.overview)) {
    report.overview = stringList(data.overview);
  }
  if (Array.isArray(data.timeline)) {
    report.timeline = objectList(data.timeline) as unknown as TimelineEntry[];
  }
  if (Array.isArray(data.incidents)) {
    const drawable = objectList(data.incidents).filter(isDrawableIncident);
    report.incidents = drawable as unknown as IncidentReport[];
  }
  if (isPlainObject(data.engine)) {
    report.engine = data.engine as unknown as EngineInfo;
  }
  if (isPlainObject(data.coverage)) {
    report.coverage = data.coverage as unknown as CoverageInfo;
  }
  if (isPlainObject(data.validation)) {
    report.validation = data.validation as unknown as ValidationInfo;
  }
  if (Array.isArray(data.promptInjection)) {
    report.promptInjection = objectList(data.promptInjection) as unknown as InjectionAttempt[];
  }
  return report;
}
