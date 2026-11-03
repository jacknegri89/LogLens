import { ATTACK_SIGNATURE } from '../content/rules';
import type { Severity } from '../types/report';
import type { AnalyzeInput } from './AIProvider';
import type { AIReport } from './schema';

const SEVERITY_ORDER: Severity[] = ['informational', 'low', 'medium', 'high', 'critical'];
const FALLBACK_EVIDENCE_LINES = 3;
const INJECTION_PHRASE =
  /ignore (?:all |the )?(?:previous|above|prior)|disregard (?:all |the )?(?:previous|above)|you are now|new instructions|system prompt|classify (?:this )?as/i;
const MARKDOWN_IMAGE = /!\[[^\]]*\]\([^)]*\)/g;
const HTML_TAG = /<\/?[a-z][^>]*>/gi;
const URL_PATTERN = /https?:\/\/[^\s)"'<>`]+/gi;
const PIPE_TO_SHELL = /\|\s*(?:sudo\s+)?(?:sh|bash|zsh|python\d?|node|perl)\b/i;

function rank(severity: Severity): number {
  return SEVERITY_ORDER.indexOf(severity);
}

/** The lowest severity the log itself allows, whatever the model says. */
function severityFloor({ excerpt, severityHint }: AnalyzeInput): Severity {
  const isAttack = ATTACK_SIGNATURE.test(excerpt) || INJECTION_PHRASE.test(excerpt);
  return isAttack || severityHint === 'high' ? 'high' : 'informational';
}

/** Evidence has to be a whole line of the log: a line the model made up is dropped. */
function keepRealLines(keyLines: string[], excerpt: string): string[] {
  const logLines = excerpt.split('\n').map((line) => line.trim());
  const real = keyLines.filter((line) => line.trim() !== '' && logLines.includes(line.trim()));
  if (real.length > 0) return real;
  return logLines.filter((line) => line !== '').slice(0, FALLBACK_EVIDENCE_LINES);
}

/**
 * Removes what could carry data out or run code once a reader pastes the text somewhere
 * (images, HTML, links the log never contained). A link that is in the log itself stays.
 */
function cleanText(text: string, excerpt: string): string {
  return text
    .replace(MARKDOWN_IMAGE, '')
    .replace(HTML_TAG, '')
    .replace(URL_PATTERN, (url) => (excerpt.includes(url) ? url : '[link removed]'));
}

/** A step that pipes a download into a shell is never advice LogLens gives. */
function keepSafeSteps(steps: string[]): string[] {
  return steps.filter((step) => !PIPE_TO_SHELL.test(step));
}

/**
 * Checks a model's report against the log it came from. The log is untrusted text: a line in
 * it can tell the model to play the problem down, to quote something else or to add a link.
 * The checks below do not depend on the model obeying the prompt.
 */
export function guardReport(report: AIReport, input: AnalyzeInput): AIReport {
  const floor = severityFloor(input);
  const severity = rank(report.severity) < rank(floor) ? floor : report.severity;
  const clean = (text: string) => cleanText(text, input.excerpt);
  return {
    ...report,
    severity,
    title: clean(report.title),
    category: clean(report.category),
    keyLines: keepRealLines(report.keyLines, input.excerpt),
    causes: report.causes.map(clean),
    debugSteps: keepSafeSteps(report.debugSteps).map(clean),
    bugReportMarkdown: cleanMarkdown(report.bugReportMarkdown, severity, input.excerpt),
  };
}

/** The issue text, cleaned, with its severity line set to the severity the report really has. */
function cleanMarkdown(markdown: string, severity: Severity, excerpt: string): string {
  return cleanText(markdown, excerpt).replace(
    /^(\*{0,2}Severit(?:y|à|a)\*{0,2}:?\*{0,2}\s*).*$/im,
    `$1${severity}`,
  );
}
