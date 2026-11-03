import { FALLBACK_RULE, RULES, type Rule } from '../content/rules';
import type { Severity } from '../types/report';

const SERVER_ERROR = /"\s5\d{2}\b|\bstatus[=:\s]+5\d{2}\b|HTTP\/\d(?:\.\d)?"?\s+5\d{2}\b/i;
const MAX_TITLE_LENGTH = 100;
const ACCESS_LOG_REQUEST = /"(\S+) (\S+) HTTP\/[\d.]+" (\d{3})/;

export const SEVERITY_ORDER: Severity[] = ['informational', 'low', 'medium', 'high', 'critical'];

/** The first rule that matches the text, or the fallback rule when none does. */
export function pickRule(text: string): Rule {
  return RULES.find((rule) => rule.pattern.test(text)) ?? FALLBACK_RULE;
}

/** An attack that the server answered with a 5xx reached the application: it is critical. */
export function pickSeverity(rule: Rule, text: string, severityHint: Severity): Severity {
  if (rule.criticalOnServerError && SERVER_ERROR.test(text)) return 'critical';
  return rule.severity ?? severityHint;
}

/** The higher of two severities: a finding can raise the severity of a report, never lower it. */
export function raiseSeverity(current: Severity, floor: Severity): Severity {
  return SEVERITY_ORDER.indexOf(floor) > SEVERITY_ORDER.indexOf(current) ? floor : current;
}

/** Drops a leading "timestamp LEVEL" prefix so the title reads as a plain message. */
export function makeTitle(keyLines: string[]): string {
  const first = keyLines[0] ?? '';
  const request = first.match(ACCESS_LOG_REQUEST);
  if (request) {
    return `${request[1]} ${request[2]} returned ${request[3]}`.slice(0, MAX_TITLE_LENGTH);
  }
  const withoutTimestamp = first.replace(
    /^(?:\d{4}-\d{2}-\d{2}[T ])?\d{2}:\d{2}:\d{2}(?:[.,]\d+)?Z?\s+/,
    '',
  );
  const withoutPrefix = withoutTimestamp.replace(
    /^(?:INFO|WARN|WARNING|ERROR|DEBUG|FATAL)\s+/i,
    '',
  );
  return withoutPrefix.trim().slice(0, MAX_TITLE_LENGTH) || 'Unknown issue';
}
