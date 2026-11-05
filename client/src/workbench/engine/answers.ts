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
  if (flat.length > MAX_LINE_CHARACTERS) {
    return flat.slice(0, MAX_LINE_CHARACTERS) + '...';
  }
  return flat;
}

function rootCause(record: AnalysisRecord, { text }: AnswerContext): string {
  const t = text.rootCause;
  const [first, ...others] = record.report.causes;
  if (!first) {
    return t.none;
  }
  const root = (record.report.timeline ?? []).find((entry) => entry.role === 'root');
  let when = '';
  let chain = '';
  let othersHeading = '';
  if (root?.time) {
    when = fillTemplate(t.at, { time: root.time });
  }
  if (root) {
    chain = fillTemplate(t.chain, { title: root.title, when });
  }
  if (others.length > 0) {
    othersHeading = t.others;
  }
  return joinLines([
    fillTemplate(t.lead, { cause: first }),
    othersHeading,
    ...bullets(others.slice(0, MAX_LISTED)),
    chain,
  ]);
}

function firstStep(record: AnalysisRecord, { text }: AnswerContext): string {
  const t = text.firstStep;
  const [first, ...later] = record.report.debugSteps;
  if (!first) {
    return t.none;
  }
  const next = later.slice(0, MAX_LISTED);
  const lines = [fillTemplate(t.lead, { step: first })];
  if (next.length > 0) {
    lines.push(t.then);
  }
  return joinLines([...lines, ...bullets(next)]);
}

function attackFindings(record: AnalysisRecord): Finding[] {
  return (record.report.findings ?? []).filter((finding) => finding.technique || finding.owasp);
}

function describeFinding(finding: Finding, { text }: AnswerContext): string {
  const tags: string[] = [];
  if (finding.technique) {
    tags.push(fillTemplate(text.isAttack.technique, { technique: finding.technique }));
  }
  if (finding.owasp) {
    tags.push(fillTemplate(text.isAttack.owasp, { owasp: finding.owasp }));
  }
  const visibleTags = tags.filter((tag) => tag !== '');
  if (visibleTags.length > 0) {
    return `${finding.title} (${visibleTags.join(', ')})`;
  }
  return finding.title;
}

function isAttack(record: AnalysisRecord, context: AnswerContext): string {
  const t = context.text.isAttack;
  const findings = attackFindings(record);
  const flagged = record.category.toLowerCase() === 'security attack' || findings.length > 0;
  const values = { category: record.category, severity: context.severityLabels[record.severity] };
  if (!flagged) {
    return fillTemplate(t.no, values);
  }
  let signals = [record.title];
  if (findings.length > 0) {
    signals = findings.map((finding) => describeFinding(finding, context));
  }
  return joinLines([fillTemplate(t.yes, values), t.signals, ...bullets(signals)]);
}

/** The 1-based number of the first log line that contains the text, or null. */
function lineNumberOf(rawLog: string, line: string): number | null {
  const index = rawLog.split('\n').findIndex((candidate) => candidate.includes(line.trim()));
  if (index === -1) {
    return null;
  }
  return index + 1;
}

function firstFailure(record: AnalysisRecord, { text }: AnswerContext): string {
  const t = text.firstFailure;
  const [first] = record.report.keyLines;
  if (!first) {
    return t.none;
  }
  const number = lineNumberOf(record.rawLog, first);
  let place = '';
  if (number !== null) {
    place = fillTemplate(t.place, { number });
  }
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
  let overviewHeading = '';
  let effectsHeading = '';
  if (overview.length > 0) {
    overviewHeading = t.overview;
  }
  if (effects.length > 0) {
    effectsHeading = t.effects;
  }
  return joinLines([
    fillTemplate(t.lead, impactValues(record, severityLabels)),
    overviewHeading,
    ...bullets(overview),
    effectsHeading,
    ...bullets(effects.slice(0, MAX_LISTED + 1)),
    t.scope,
  ]);
}

function prevent(record: AnalysisRecord, { text }: AnswerContext): string {
  const t = text.prevent;
  const causes = record.report.causes.slice(0, MAX_LISTED);
  if (causes.length === 0) {
    return t.none;
  }
  const steps = record.report.debugSteps.slice(0, MAX_LISTED);
  let stepsHeading = '';
  if (steps.length > 0) {
    stepsHeading = t.steps;
  }
  return joinLines([t.lead, ...bullets(causes), stepsHeading, ...bullets(steps), t.pointer]);
}

function explainSimply(record: AnalysisRecord, { text }: AnswerContext): string {
  const t = text.explainSimply;
  const [cause] = record.report.causes;
  const [step] = record.report.debugSteps;
  let causeText = t.noCause;
  let stepText = '';
  if (cause) {
    causeText = fillTemplate(t.because, { cause });
  }
  if (step) {
    stepText = fillTemplate(t.first, { step });
  }
  return joinLines([
    fillTemplate(t.text, { category: record.category, title: record.title }),
    causeText,
    stepText,
  ]);
}

function timeline(record: AnalysisRecord, { text }: AnswerContext): string {
  const t = text.timeline;
  const entries = record.report.timeline ?? [];
  if (entries.length < 2) {
    return t.single;
  }
  const lines = entries.map((entry, index) => {
    let when = '';
    if (entry.time) {
      when = fillTemplate(t.when, { time: entry.time });
    }
    return fillTemplate(t.line, {
      number: index + 1,
      when,
      title: entry.title,
      role: t.roles[entry.role],
    });
  });
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
  if (intent) {
    return BUILDERS[intent](record, context);
  }
  return fallback(context);
}
