import { extractLogDetails } from '../../content/logDetails';
import { reportText, ruleCauses, ruleText } from '../../content/localized';
import { FAILURE_LINE, FALLBACK_RULE, type Rule } from '../../content/rules';
import { DEFAULT_LANGUAGE, type Language } from '../../types/language';
import type { Severity } from '../../types/report';
import type { AIProvider, AnalyzeInput } from '../AIProvider';
import { correlateIncident, type Correlation } from '../correlation';
import { splitLines } from '../eventTimeline';
import { buildFindings } from '../findings';
import { makeTitle, pickRule, pickSeverity, raiseSeverity } from '../ruleMatching';
import { aiReportSchema, type AIReport } from '../schema';

const MAX_KEY_LINES = 6;

/** True when a known failure matches the text, so the rules can explain it without a model. */
export function hasKnownRule(text: string): boolean {
  return pickRule(text) !== FALLBACK_RULE;
}

/** The lines that prove the rule. A lead line, when given, comes first so the title describes it. */
function pickKeyLines(lines: string[], rule: Rule, leadLine?: string): string[] {
  const matching = lines.filter((line) => rule.pattern.test(line) || FAILURE_LINE.test(line));
  const chosen = matching.length > 0 ? matching : lines;
  const ordered = leadLine === undefined ? chosen : [leadLine, ...chosen];
  return [...new Set(ordered)].slice(0, MAX_KEY_LINES);
}

interface IssueFields {
  title: string;
  severity: Severity;
  category: string;
  keyLines: string[];
  overview: string[];
  causes: string[];
  debugSteps: string[];
}

function buildIssue(issue: IssueFields, language: Language): string {
  const fence = codeFence(issue.keyLines);
  const text = reportText(language);
  return [
    `## ${issue.title}`,
    '',
    `**${text.severity}:** ${issue.severity}`,
    `**${text.category}:** ${issue.category}`,
    '',
    ...overviewSection(issue.overview, text.bigPicture),
    `### ${text.logLines}`,
    '',
    fence,
    ...issue.keyLines,
    fence,
    '',
    ...causesSection(issue.causes, text.probableCauses),
    ...stepsSection(issue.debugSteps, text.nextSteps),
    `_${text.generatedByRules}_`,
  ].join('\n');
}

/** A code fence longer than any run of backticks in the lines, so a log line cannot close it. */
function codeFence(lines: string[]): string {
  const longestRun = Math.max(
    0,
    ...lines.flatMap((line) => line.match(/`+/g) ?? []).map((run) => run.length),
  );
  return '`'.repeat(Math.max(3, longestRun + 1));
}

function overviewSection(overview: string[], heading: string): string[] {
  if (overview.length === 0) return [];
  return [`### ${heading}`, '', ...overview.map((sentence) => `- ${sentence}`), ''];
}

function causesSection(causes: string[], heading: string): string[] {
  return [`### ${heading}`, '', ...causes.map((cause) => `- ${cause}`), ''];
}

function stepsSection(debugSteps: string[], heading: string): string[] {
  return [`### ${heading}`, '', ...debugSteps.map((step, index) => `${index + 1}. ${step}`), ''];
}

/**
 * The rule that describes the report. When the events are connected it is the rule of the
 * root cause, so the headline names what to fix first; otherwise it is the first rule that matches.
 */
function pickMainRule(excerpt: string, correlation: Correlation): Rule {
  return pickRule(correlation.rootCause?.evidence ?? excerpt);
}

function findLine(lines: string[], evidence: string | undefined): string | undefined {
  return evidence === undefined ? undefined : lines.find((line) => line.startsWith(evidence));
}

function describeIssue(
  input: AnalyzeInput,
  lines: string[],
  correlation: Correlation,
  language: Language,
): IssueFields {
  const { excerpt, severityHint } = input;
  const rule = pickMainRule(excerpt, correlation);
  const text = ruleText(rule, language);
  const keyLines = pickKeyLines(lines, rule, findLine(lines, correlation.rootCause?.evidence));
  const severity = pickSeverity(rule, excerpt, severityHint);
  return {
    title: makeTitle(keyLines, language),
    // A login accepted after a brute force means the account may be lost: that is critical.
    severity: correlation.compromisedLogin ? raiseSeverity(severity, 'critical') : severity,
    category: rule.category,
    keyLines,
    overview: correlation.overview,
    causes: [...correlation.overview.slice(0, 1), ...ruleCauses(text, extractLogDetails(excerpt))],
    debugSteps: text.debugSteps,
  };
}

function buildReport(input: AnalyzeInput): AIReport {
  const language = input.language ?? DEFAULT_LANGUAGE;
  const lines = splitLines(input.excerpt);
  const findings = buildFindings(input.excerpt, input.severityHint, language);
  const correlation = correlateIncident(input.excerpt, findings, language);
  const { overview, ...issue } = describeIssue(input, lines, correlation, language);

  return aiReportSchema.parse({
    ...issue,
    bugReportMarkdown: buildIssue({ ...issue, overview }, language),
    ...(findings.length > 0 ? { findings } : {}),
    ...(overview.length > 0 ? { overview } : {}),
    ...(correlation.timeline.length > 0 ? { timeline: correlation.timeline } : {}),
  });
}

/**
 * Analyses a log with a table of known failures instead of calling a model.
 * It needs no key and no network, and the same log always gives the same
 * report. It recognises common problems; for anything else it says so.
 */
export class RulesProvider implements AIProvider {
  readonly name = 'rules';

  analyze(input: AnalyzeInput): Promise<AIReport> {
    return Promise.resolve(buildReport(input));
  }
}
