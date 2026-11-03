import { FALLBACK_RULE, type Rule } from '../content/rules';
import { DEFAULT_LANGUAGE, type Language } from '../types/language';
import type { Finding, Severity } from '../types/report';
import { makeTitle, pickRule, pickSeverity, SEVERITY_ORDER } from './ruleMatching';

export const MAX_FINDINGS = 5;
const MIN_FINDINGS_TO_REPORT = 2;
const MAX_EVIDENCE_LENGTH = 2000;

function toFinding(rule: Rule, line: string, severityHint: Severity, language: Language): Finding {
  const finding: Finding = {
    title: makeTitle([line], language),
    severity: pickSeverity(rule, line, severityHint),
    category: rule.category,
    evidence: line.slice(0, MAX_EVIDENCE_LENGTH),
  };
  if (rule.mitre) finding.technique = rule.mitre;
  if (rule.owasp) finding.owasp = rule.owasp;
  return finding;
}

/** One finding per rule, built from the first line that matches it, in order of appearance. */
function groupByRule(lines: string[], severityHint: Severity, language: Language): Finding[] {
  const seenRules = new Set<Rule>();
  const findings: Finding[] = [];
  for (const line of lines) {
    const rule = pickRule(line);
    if (rule === FALLBACK_RULE || seenRules.has(rule)) continue;
    seenRules.add(rule);
    findings.push(toFinding(rule, line, severityHint, language));
  }
  return findings;
}

function rank(severity: Severity): number {
  return SEVERITY_ORDER.indexOf(severity);
}

/**
 * The distinct problems in an excerpt, most severe first. A log with a single problem
 * gives an empty list: the main issue of the report already says everything.
 */
export function buildFindings(
  excerpt: string,
  severityHint: Severity,
  language: Language = DEFAULT_LANGUAGE,
): Finding[] {
  const lines = excerpt.split('\n').filter((line) => line.trim() !== '');
  const findings = groupByRule(lines, severityHint, language);
  if (findings.length < MIN_FINDINGS_TO_REPORT) return [];
  // Array.prototype.sort is stable, so equal severities keep their order in the log.
  return findings.sort((a, b) => rank(b.severity) - rank(a.severity)).slice(0, MAX_FINDINGS);
}
