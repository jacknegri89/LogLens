import { ATTACK_SIGNATURE, FAILURE_LINE } from '../content/rules';
import type { NormalizedLogEvent } from '../parser/normalizedEvent';
import { FAILURE_SIGNAL, noiseKindOf, type NoiseKind } from '../parser/noiseFilter';

/**
 * Says what an event is worth to an analysis, from the event alone: an anomaly (and how strong),
 * a change or a state transition that explains later events, or routine traffic. The selection
 * of context and the correlation engine both read this, so the words that mean "something went
 * wrong" are written once.
 */

export type AnomalyStrength = 'high' | 'medium' | 'low';

export interface Anomaly {
  strength: AnomalyStrength;
  /** Short reasons in English: the level, the status, the wording that made the event an anomaly. */
  reasons: string[];
}

/** `change`: a deployment, a configuration or an operational change. `state`: a business or status transition. */
export type SignificantKind = 'change' | 'state';

export interface EventClass {
  anomaly: Anomaly | null;
  significant: SignificantKind | null;
  /** Set only for routine traffic that reports no failure. */
  routine: NoiseKind | null;
}

/** How much of the record is read for wording: a stack trace of 400 lines needs no full scan. */
const TEXT_WINDOW = 800;

const AUTH_FAILURE =
  /failed password|authentication fail|invalid user|permission denied|unauthori[sz]ed|forbidden|access denied|login failed|invalid (?:token|credentials)/i;
const TIMEOUT_WORDING = /\btimeout\b|timed out|deadline exceeded|etimedout/i;

const CHANGE_WORDING =
  /\b(?:deploy(?:ed|ing|ment)?|rollout|rolled (?:out|back)|rollback|release[ds]?|(?:config(?:uration)?|settings?)\s+(?:change[ds]?|updated?|reload(?:ed)?|applied|loaded|override[dn]?)|(?:applied|loaded|reloaded|updated|changed)\s+(?:the\s+)?config(?:uration)?|feature[ -]?flag|(?:flag|toggle)\s+\S+\s+(?:enabled|disabled|on|off)|migration\s+(?:applied|started|completed)|schema\s+(?:change|migrat\w+)|scal(?:ed|ing)\s+(?:up|down|to)|autoscal\w*|restart(?:ed|ing)|shutting down|upgraded|downgraded|certificate\s+(?:renewed|rotated)|secret\s+rotated|version\s+\d[\w.]*\s+(?:started|deployed|live))\b/i;
// What a value change must be about to count as a configuration change, not as any arrow in a message.
const CONFIGURABLE_SUBJECT =
  /config|setting|ttl|limit|timeout|flag|version|threshold|interval|size/i;
// "ttl: 900000 -> 900", "changed from 900000 to 900", "was 10, now 2"
const VALUE_CHANGE = /\S+\s*(?:->|→|=>)\s*\S+|\bfrom\s+\S+\s+to\s+\S+|\bwas\s+\S+,?\s+now\s+\S+/i;
const STATE_WORDING =
  /\b(?:payment\s+(?:confirmed|captured|succeeded|received|authori[sz]ed|completed|refunded)|order\s+(?:created|placed|paid|confirmed|shipped|cancel(?:l)?ed|fulfilled|completed)|status\s+(?:changed|transition\w*|updated)|state\s+(?:changed|transition\w*)|(?:reservation|booking|inventory|stock)\s+(?:created|reserved|released|expired|confirmed|committed)|fulfil(?:l)?ment\s+(?:started|completed|created|requested))\b/i;

/**
 * Failures the general failure wording does not name: memory, crashes, deadlocks, things that could
 * not start. "crash recovery" is routine in a database log and is not one.
 */
const RESOURCE_FAILURE =
  /out of memory|\boom\b|\bcrash(?:ed|es|ing)?\b(?! recovery)|segfault|core dumped|deadlock|corrupt(?:ed|ion)?\b|cannot (?:allocate|open|connect|bind|start)|could not (?:connect|open|bind|start|allocate)|unable to (?:connect|open|bind|start|allocate)|\bpanicked\b|\bORA-\d{4,5}\b|\bviolated\b|\b(?:is|are) full\b|no space left|rolled back|\bsuccess=no\b|\bback-off (?:pulling|restarting)\b|crashloop|\berrimagepull\b|\bimagepullbackoff\b|\bevicted\b|\bfailed(?:scheduling|mount|create)\b|\bnot allowed\b|\bnot permitted\b|\bunhealthy\b|\bunreachable\b|not responding|blocked for more than|soft lockup|hung task|\bBUG:|\berrors\b/i;

function textOf(event: NormalizedLogEvent): string {
  return `${event.message}\n${event.raw.slice(0, TEXT_WINDOW)}`;
}

function anomalyFromFields(event: NormalizedLogEvent): Anomaly | null {
  if (event.level === 'fatal' || event.level === 'error') {
    return { strength: 'high', reasons: [`level ${event.level}`] };
  }
  if (event.attributes.exceptionClass !== undefined) {
    return { strength: 'high', reasons: [`exception ${String(event.attributes.exceptionClass)}`] };
  }
  if (event.statusCode !== null && event.statusCode >= 500) {
    return { strength: 'high', reasons: [`status ${event.statusCode}`] };
  }
  return null;
}

/** The wording that marks a problem in an event whose level or status did not say so. */
/**
 * Phrases that say there was no failure: "errors=0", "0 failures", "no errors", "error budget".
 * They are taken out before the text is read for failure wording, so a metrics line is not a failure.
 */
const NEGATED_FAILURE =
  /\b(?:errors?|fail(?:ed|ures?)?|exceptions?|max[_ -]?failures?|timeouts?)\s*[=:]\s*0\b|\b0 (?:errors?|failures?|failed|exceptions?)\b|\b(?:no|without|zero) (?:errors?|failures?|exceptions?)\b|\berror[ _-](?:budget|rate|free|count|level|handling|page)\b/gi;

function anomalyFromWording(originalText: string): Anomaly | null {
  if (ATTACK_SIGNATURE.test(originalText)) {
    return { strength: 'high', reasons: ['attack signature'] };
  }
  const text = originalText.replace(NEGATED_FAILURE, ' ');
  if (AUTH_FAILURE.test(text)) {
    return { strength: 'medium', reasons: ['authentication failure'] };
  }
  if (TIMEOUT_WORDING.test(text)) {
    return { strength: 'medium', reasons: ['timeout'] };
  }
  if (FAILURE_LINE.test(text)) {
    return { strength: 'medium', reasons: ['failure wording'] };
  }
  if (RESOURCE_FAILURE.test(text)) {
    return { strength: 'medium', reasons: ['resource failure wording'] };
  }
  return null;
}

/** An anomaly with its strength, or null for an event that reports nothing wrong. */
export function anomalyOf(event: NormalizedLogEvent): Anomaly | null {
  const base = anomalyFromEvent(event);
  // A request that carries an attack payload is always flagged as one, whatever the server answered.
  if (ATTACK_SIGNATURE.test(textOf(event))) {
    const reasons = [...(base?.reasons ?? []), 'attack signature'];
    return { strength: 'high', reasons };
  }
  return base;
}

function anomalyFromEvent(event: NormalizedLogEvent): Anomaly | null {
  const fromFields = anomalyFromFields(event);
  if (fromFields) {
    return fromFields;
  }
  if (event.level === 'warn') {
    return { strength: 'medium', reasons: ['level warn'] };
  }
  if (event.statusCode !== null && event.statusCode >= 400) {
    return { strength: 'medium', reasons: [`status ${event.statusCode}`] };
  }
  return anomalyFromWording(textOf(event));
}

/** Changes and state transitions are INFO lines that often explain an error that comes later. */
export function significantKindOf(event: NormalizedLogEvent): SignificantKind | null {
  const text = event.message;
  const saysChange = CHANGE_WORDING.test(text);
  const changesAValue = VALUE_CHANGE.test(text) && CONFIGURABLE_SUBJECT.test(text);
  if (saysChange || changesAValue) {
    return 'change';
  }
  if (STATE_WORDING.test(text)) {
    return 'state';
  }
  return null;
}

/** The kind of routine traffic an event is, unless it reports a failure. */
export function routineKindOf(event: NormalizedLogEvent): NoiseKind | null {
  const kind = noiseKindOf(event.raw.slice(0, TEXT_WINDOW));
  if (kind === null || FAILURE_SIGNAL.test(event.raw.slice(0, TEXT_WINDOW))) {
    return null;
  }
  return kind;
}

export function classifyEvent(event: NormalizedLogEvent): EventClass {
  return {
    anomaly: anomalyOf(event),
    significant: significantKindOf(event),
    routine: routineKindOf(event),
  };
}
