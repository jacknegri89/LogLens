import { maskSecrets } from '../analysis/masking';
import type { NormalizedLogEvent } from '../parser/normalizedEvent';
import type {
  IncidentReport,
  ReportEvidence,
  RootCauseStatus,
  ValidationInfo,
  ValidationIssue,
} from '../types/report';

/**
 * The Evidence Validator: a deterministic check of what a report claims against the log it came
 * from. A model can only judge the events it was shown, so every id, line, quote, value and
 * certainty in its answer is checked here, and what the log does not support is corrected or
 * removed and reported as an issue. It never adds evidence to make a claim pass: a claim without
 * support is flagged, not rescued.
 *
 * Nothing here calls a model or the network.
 */

export interface ValidationContext {
  eventsById: Map<string, NormalizedLogEvent>;
  /** The whole original log: a value is "in the data" when it appears in it. */
  rawLog: string;
}

const STATUS_RANK: Record<RootCauseStatus, number> = {
  confirmed: 3,
  probable: 2,
  unverified: 1,
  insufficient: 0,
};

/** The first line of an event is what an evidence quote shows. */
const QUOTE_LENGTH = 300;

/** Order and invoice ids written like `O-1101` or `INV-77`. */
const PREFIXED_ID = /\b[A-Z]{1,5}-\d{2,}\b/g;
/** "order #4411", "ordine 4411". */
const NUMBERED_ORDER = /\b(?:order|ordine)\s*#?\s*(\d{3,})\b/gi;
const AMOUNT = /(?:[€$£]\s?\d+(?:[.,]\d{1,2})?|\b\d+(?:[.,]\d{1,2})?\s?(?:EUR|USD|GBP|€|\$|£))/g;
const ISO_TIME = /\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?Z?/g;
const EVENT_ID = /\bE\d+\b/g;
const SENTENCE_BREAK = /(?<=[.!?])\s+/;

const PIPE_TO_SHELL = /\|\s*(?:sudo\s+)?(?:sh|bash|zsh|python\d?|node|perl)\b/i;
const DESTRUCTIVE_COMMAND =
  /\brm\s+-[a-z]*r[a-z]*\b|\bdrop\s+(?:table|database|schema)\b|\btruncate\s+table\b|\bdelete\s+from\s+\w+\s*(?:;|$)|\bmkfs\b|\bdd\s+if=|chmod\s+-R\s+777|git\s+push\s+(?:--force|-f)\b|git\s+reset\s+--hard|kubectl\s+delete|docker\s+system\s+prune|\bformat\s+[a-z]:/i;
/** Words that show the author already warned about what the command does. */
const WARNING_WORDS =
  /\bwarning\b|attenzione|\bbackup\b|back up|irreversible|irreversibile|destructive|distruttiv/i;

/** The first line of an event as a report shows it: cut, with secrets hidden. */
function firstLine(event: NormalizedLogEvent): string {
  return maskSecrets(event.raw.split('\n', 1)[0].slice(0, QUOTE_LENGTH)).text;
}

/** Checks one piece of evidence: the event exists, the lines are its lines, the quote is its text. */
export function checkEvidence(
  reference: ReportEvidence,
  context: ValidationContext,
): ValidationIssue | null {
  const event = context.eventsById.get(reference.eventId);
  if (event === undefined) {
    return { code: 'unknown-event', detail: `Event ${reference.eventId} is not in the log.` };
  }
  const sameLines =
    reference.lineStart === event.originalLineStart && reference.lineEnd === event.originalLineEnd;
  if (!sameLines || !firstLine(event).startsWith(reference.quote.slice(0, 40))) {
    return {
      code: 'quote-mismatch',
      detail: `Event ${reference.eventId}: the lines or the quote do not match the original log.`,
    };
  }
  return null;
}

/** A piece of evidence rebuilt from the real event: lines and quote come from the log, never from a claim. */
export function evidenceFromEvent(event: NormalizedLogEvent, note?: string): ReportEvidence {
  const reference: ReportEvidence = {
    eventId: event.eventId,
    lineStart: event.originalLineStart,
    lineEnd: event.originalLineEnd,
    quote: firstLine(event),
  };
  if (note !== undefined) {
    reference.note = note;
  }
  return reference;
}

function valuesIn(text: string): string[] {
  const values: string[] = [];
  for (const pattern of [PREFIXED_ID, AMOUNT, ISO_TIME]) {
    for (const match of text.matchAll(pattern)) {
      values.push(match[0]);
    }
  }
  for (const match of text.matchAll(NUMBERED_ORDER)) {
    values.push(match[1]);
  }
  return values;
}

function appearsInLog(value: string, context: ValidationContext): boolean {
  const candidates = [
    value,
    value.replace('T', ' '),
    value.replace(' ', 'T'),
    value.replace(/Z$/, ''),
  ];
  return candidates.some((candidate) => context.rawLog.includes(candidate));
}

function unknownEventIds(text: string, context: ValidationContext): string[] {
  return [...text.matchAll(EVENT_ID)]
    .map((match) => match[0])
    .filter((id) => !context.eventsById.has(id));
}

export interface SanitizedText {
  text: string;
  /** The values and event ids that the log does not contain, in the sentences that were removed. */
  unsupported: string[];
}

/**
 * Removes the sentences that name an order, an amount, a time or an event that is not in the log.
 * A sentence is the unit: half a claim is not kept.
 */
export function sanitizeClaims(text: string, context: ValidationContext): SanitizedText {
  const unsupported: string[] = [];
  const kept: string[] = [];
  for (const sentence of text.split(SENTENCE_BREAK)) {
    const missing = [
      ...valuesIn(sentence).filter((value) => !appearsInLog(value, context)),
      ...unknownEventIds(sentence, context),
    ];
    if (missing.length === 0) {
      kept.push(sentence);
      continue;
    }
    unsupported.push(...missing);
  }
  return { text: kept.join(' ').trim(), unsupported };
}

/**
 * A claim of "confirmed" needs a cause the engine itself confirmed; the model may ask for more
 * certainty than the links allow, and does not get it. Any claim above "insufficient" needs at
 * least one valid piece of evidence.
 */
export function capCertainty(
  claimed: RootCauseStatus,
  engine: RootCauseStatus,
  validEvidenceCount: number,
): { status: RootCauseStatus; downgraded: boolean } {
  let ceiling: RootCauseStatus = 'probable';
  if (engine === 'confirmed') {
    ceiling = 'confirmed';
  }
  let status = claimed;
  if (STATUS_RANK[claimed] > STATUS_RANK[ceiling]) {
    status = ceiling;
  }
  if (status !== 'insufficient' && validEvidenceCount === 0) {
    status = 'insufficient';
    if (STATUS_RANK[engine] > 0) {
      status = engine;
    }
  }
  return { status, downgraded: status !== claimed };
}

export interface CheckedStep {
  /** The step to show, or null when it must not be shown. */
  step: string | null;
  issue: ValidationIssue | null;
}

/** A step that pipes a download into a shell is dropped; a destructive one gets a warning. */
export function checkCommandStep(step: string, caution: string): CheckedStep {
  if (PIPE_TO_SHELL.test(step)) {
    return {
      step: null,
      issue: {
        code: 'dangerous-command',
        detail: 'A step that pipes a download into a shell was removed.',
      },
    };
  }
  if (DESTRUCTIVE_COMMAND.test(step) && !WARNING_WORDS.test(step)) {
    return {
      step: `${caution} ${step}`,
      issue: { code: 'dangerous-command', detail: 'A destructive command was given a warning.' },
    };
  }
  return { step, issue: null };
}

/**
 * Checks a finished report once more, whoever wrote its parts: every evidence it carries must
 * match the log. What does not match is dropped from the report and listed in the result.
 */
export function validateIncidentReports(
  incidents: IncidentReport[],
  context: ValidationContext,
  earlierIssues: ValidationIssue[] = [],
): { incidents: IncidentReport[]; validation: ValidationInfo } {
  const issues = [...earlierIssues];
  let checked = 0;
  const keepValid = (list: ReportEvidence[], incidentId: string): ReportEvidence[] =>
    list.filter((reference) => {
      checked += 1;
      const issue = checkEvidence(reference, context);
      if (issue !== null) {
        issues.push({ ...issue, incidentId });
      }
      return issue === null;
    });
  const result = incidents.map((incident): IncidentReport => {
    const evidence = keepValid(incident.rootCause.evidence, incident.id);
    const secondarySymptoms = keepValid(incident.secondarySymptoms, incident.id);
    let { status } = incident.rootCause;
    // A cause that no longer has any evidence behind it cannot stay above "insufficient".
    if (status !== 'insufficient' && evidence.length === 0) {
      issues.push({
        code: 'missing-evidence',
        incidentId: incident.id,
        detail: 'The root cause had no valid evidence left: it was downgraded.',
      });
      status = 'insufficient';
    }
    return {
      ...incident,
      rootCause: { ...incident.rootCause, status, evidence },
      secondarySymptoms,
    };
  });
  return { incidents: result, validation: { checked, issues } };
}
