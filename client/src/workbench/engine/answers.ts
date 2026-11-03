import type { AskAnswerText } from '../../content/workbenchAsk';
import type { AnalysisRecord, Finding, Severity } from '../../lib/types';
import { fillTemplate } from './fillTemplate';
import type { IntentId } from './intents';

/** Everything an answer needs besides the analysis: the page language's wording. */
export interface AnswerContext {
  text: AskAnswerText;
  severityLabels: Record<Severity, string>;
}

const MAX_LISTED = 3;
const MAX_LINE_CHARACTERS = 300;

function bullets(items: string[]): string[] {
  return items.map((item) => '- ' + item);
}

function joinLines(lines: string[]): string {
  return lines.filter((line) => line !== '').join('\n');
}

function shortLine(line: string): string {
  const flat = line.trim();
  return flat.length > MAX_LINE_CHARACTERS ? flat.slice(0, MAX_LINE_CHARACTERS) + '...' : flat;
}

function rootCause(record: AnalysisRecord, { text }: AnswerContext): string {
  const t = text.rootCause;
  const [first, ...others] = record.report.causes;
  if (!first) return t.none;
  const root = (record.report.timeline ?? []).find((entry) => entry.role === 'root');
  const when = root?.time ? fillTemplate(t.at, { time: root.time }) : '';
  return joinLines([
    fillTemplate(t.lead, { cause: first }),
    others.length > 0 ? t.others : '',
    ...bullets(others.slice(0, MAX_LISTED)),
    root ? fillTemplate(t.chain, { title: root.title, when }) : '',
  ]);
}

function firstStep(record: AnalysisRecord, { text }: AnswerContext): string {
  const t = text.firstStep;
  const [first, ...later] = record.report.debugSteps;
  if (!first) return t.none;
  const next = later.slice(0, MAX_LISTED);
  return joinLines([
    fillTemplate(t.lead, { step: first }),
    next.length > 0 ? t.then : '',
    ...bullets(next),
  ]);
}

function attackFindings(record: AnalysisRecord): Finding[] {
  return (record.report.findings ?? []).filter((finding) => finding.technique || finding.owasp);
}

function describeFinding(finding: Finding, { text }: AnswerContext): string {
  const tags = [
    finding.technique
      ? fillTemplate(text.isAttack.technique, { technique: finding.technique })
      : '',
    finding.owasp ? fillTemplate(text.isAttack.owasp, { owasp: finding.owasp }) : '',
  ].filter((tag) => tag !== '');
  return tags.length > 0 ? `${finding.title} (${tags.join(', ')})` : finding.title;
}

function isAttack(record: AnalysisRecord, context: AnswerContext): string {
  const t = context.text.isAttack;
  const findings = attackFindings(record);
  const flagged = record.category.toLowerCase() === 'security attack' || findings.length > 0;
  const values = { category: record.category, severity: context.severityLabels[record.severity] };
  if (!flagged) return fillTemplate(t.no, values);
  const signals =
    findings.length > 0
      ? findings.map((finding) => describeFinding(finding, context))
      : [record.title];
  return joinLines([fillTemplate(t.yes, values), t.signals, ...bullets(signals)]);
}

/** The 1-based number of the first log line that contains the text, or null. */
function lineNumberOf(rawLog: string, line: string): number | null {
  const index = rawLog.split('\n').findIndex((candidate) => candidate.includes(line.trim()));
  return index === -1 ? null : index + 1;
}

function firstFailure(record: AnalysisRecord, { text }: AnswerContext): string {
  const t = text.firstFailure;
  const [first] = record.report.keyLines;
  if (!first) return t.none;
  const number = lineNumberOf(record.rawLog, first);
  const place = number === null ? '' : fillTemplate(t.place, { number });
  return joinLines([fillTemplate(t.lead, { place }), shortLine(first)]);
}

function impactValues(record: AnalysisRecord, labels: Record<Severity, string>) {
  return {
    severity: labels[record.severity],
    category: record.category,
    count: Math.max(1, record.report.findings?.length ?? 1),
  };
}

function impact(record: AnalysisRecord, { text, severityLabels }: AnswerContext): string {
  const t = text.impact;
  const timeline = record.report.timeline ?? [];
  const effects = timeline.filter((entry) => entry.role === 'effect').map((entry) => entry.title);
  const overview = (record.report.overview ?? []).slice(0, MAX_LISTED + 1);
  return joinLines([
    fillTemplate(t.lead, impactValues(record, severityLabels)),
    overview.length > 0 ? t.overview : '',
    ...bullets(overview),
    effects.length > 0 ? t.effects : '',
    ...bullets(effects.slice(0, MAX_LISTED + 1)),
    t.scope,
  ]);
}

function prevent(record: AnalysisRecord, { text }: AnswerContext): string {
  const t = text.prevent;
  const causes = record.report.causes.slice(0, MAX_LISTED);
  if (causes.length === 0) return t.none;
  const steps = record.report.debugSteps.slice(0, MAX_LISTED);
  return joinLines([
    t.lead,
    ...bullets(causes),
    steps.length > 0 ? t.steps : '',
    ...bullets(steps),
    t.pointer,
  ]);
}

function explainSimply(record: AnalysisRecord, { text }: AnswerContext): string {
  const t = text.explainSimply;
  const [cause] = record.report.causes;
  const [step] = record.report.debugSteps;
  return joinLines([
    fillTemplate(t.text, { category: record.category, title: record.title }),
    cause ? fillTemplate(t.because, { cause }) : t.noCause,
    step ? fillTemplate(t.first, { step }) : '',
  ]);
}

function timeline(record: AnalysisRecord, { text }: AnswerContext): string {
  const t = text.timeline;
  const entries = record.report.timeline ?? [];
  if (entries.length < 2) return t.single;
  const lines = entries.map((entry, index) =>
    fillTemplate(t.line, {
      number: index + 1,
      when: entry.time ? fillTemplate(t.when, { time: entry.time }) : '',
      title: entry.title,
      role: t.roles[entry.role],
    }),
  );
  return joinLines([t.lead, ...lines]);
}

function fallback({ text }: AnswerContext): string {
  return joinLines([text.fallback.lead, ...bullets(text.fallback.topics)]);
}

const BUILDERS: Record<IntentId, (record: AnalysisRecord, context: AnswerContext) => string> = {
  rootCause,
  firstStep,
  isAttack,
  firstFailure,
  impact,
  prevent,
  explainSimply,
  timeline,
};

/** The built-in answer: every fact comes from the record, and an unknown question gets an honest fallback. */
export function buildBuiltInAnswer(
  intent: IntentId | null,
  record: AnalysisRecord,
  context: AnswerContext,
): string {
  return intent ? BUILDERS[intent](record, context) : fallback(context);
}
