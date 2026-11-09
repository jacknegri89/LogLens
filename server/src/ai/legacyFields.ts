import type { IncidentText } from '../content/incidentText';
import type { IncidentReport, ValidationIssue } from '../types/report';
import { checkCommandStep, sanitizeClaims, type ValidationContext } from './evidenceValidator';
import type { AIReport } from './schema';

/**
 * The model also writes the text fields that existed before the incidents: the title, the causes,
 * the debug steps and the Markdown of the issue. They are free prose, so the checks cannot prove
 * every sentence; they do what can be done without a model:
 * - a sentence that names an order, an amount, a time or an event the log does not contain is removed;
 * - a command that pipes a download into a shell is removed and a destructive one gets a warning;
 * - when no incident has a cause the log supports, the model's causes are shown as hypotheses.
 * What was removed is listed in the validation of the report.
 */

const CODE_FENCE = '```';

export interface LegacyCheck {
  report: AIReport;
  issues: ValidationIssue[];
  /** How many pieces of text were looked at. */
  checked: number;
}

function unsupportedIssue(field: string, values: string[]): ValidationIssue {
  return {
    code: 'unknown-value',
    detail: `The ${field} named values that are not in the log: ${values.join(', ')}.`,
  };
}

/** True when at least one incident has a root cause the log supports (probable or confirmed). */
function hasSupportedCause(incidents: IncidentReport[]): boolean {
  return incidents.some(
    (incident) =>
      incident.rootCause.status === 'confirmed' || incident.rootCause.status === 'probable',
  );
}

/**
 * The issue text, line by line. A sentence of prose that names an unknown value is removed; a line
 * of a code block that names one is replaced by a notice, because a made-up line must not pass as
 * evidence copied from the log.
 */
function checkMarkdown(
  markdown: string,
  context: ValidationContext,
  text: IncidentText,
  unsupported: string[],
): string {
  const checkedLines: string[] = [];
  let insideCode = false;
  for (const line of markdown.split('\n')) {
    if (line.trimStart().startsWith(CODE_FENCE)) {
      insideCode = !insideCode;
      checkedLines.push(line);
      continue;
    }
    if (line.trim() === '') {
      checkedLines.push(line);
      continue;
    }
    const result = sanitizeClaims(line, context);
    unsupported.push(...result.unsupported);
    if (result.unsupported.length === 0) {
      checkedLines.push(line);
      continue;
    }
    if (insideCode || result.text === '') {
      checkedLines.push(text.removedUnsupportedLine);
      continue;
    }
    checkedLines.push(result.text);
  }
  return checkedLines.join('\n');
}

export function checkLegacyFields(
  report: AIReport,
  incidents: IncidentReport[],
  context: ValidationContext,
  text: IncidentText,
  fallbackTitle: string,
): LegacyCheck {
  const issues: ValidationIssue[] = [];
  let checked = 0;

  // Title
  checked += 1;
  const title = sanitizeClaims(report.title, context);
  if (title.unsupported.length > 0) {
    issues.push(unsupportedIssue('title', title.unsupported));
  }
  let reportTitle = title.text;
  if (reportTitle === '') {
    reportTitle = fallbackTitle;
  }

  // Causes: unsupported sentences out; shown as hypotheses when no incident has a supported cause.
  const showAsHypothesis = incidents.length > 0 && !hasSupportedCause(incidents);
  const causes: string[] = [];
  const unsupportedInCauses: string[] = [];
  for (const cause of report.causes) {
    checked += 1;
    const result = sanitizeClaims(cause, context);
    unsupportedInCauses.push(...result.unsupported);
    if (result.text === '') {
      continue;
    }
    if (showAsHypothesis) {
      causes.push(`${text.unverifiedCausePrefix} ${result.text}`);
      continue;
    }
    causes.push(result.text);
  }
  if (unsupportedInCauses.length > 0) {
    issues.push(unsupportedIssue('causes', unsupportedInCauses));
  }

  // Debug steps: unsupported sentences out, then the command check.
  const debugSteps: string[] = [];
  const unsupportedInSteps: string[] = [];
  for (const step of report.debugSteps) {
    checked += 1;
    const result = sanitizeClaims(step, context);
    unsupportedInSteps.push(...result.unsupported);
    if (result.text === '') {
      continue;
    }
    const command = checkCommandStep(result.text, text.dangerousCaution);
    if (command.issue !== null) {
      issues.push(command.issue);
    }
    if (command.step !== null) {
      debugSteps.push(command.step);
    }
  }
  if (unsupportedInSteps.length > 0) {
    issues.push(unsupportedIssue('debug steps', unsupportedInSteps));
  }

  // The issue text
  checked += 1;
  const unsupportedInMarkdown: string[] = [];
  const bugReportMarkdown = checkMarkdown(
    report.bugReportMarkdown,
    context,
    text,
    unsupportedInMarkdown,
  );
  if (unsupportedInMarkdown.length > 0) {
    issues.push(unsupportedIssue('issue text', unsupportedInMarkdown));
  }

  return {
    report: { ...report, title: reportTitle, causes, debugSteps, bugReportMarkdown },
    issues,
    checked,
  };
}
