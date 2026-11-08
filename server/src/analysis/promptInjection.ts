import type { InjectionAttempt } from '../types/report';
import type { NormalizedLogEvent } from '../parser/normalizedEvent';
import { maskSecrets } from './masking';

/**
 * Finds lines of the log that try to give orders to whoever reads them. A log is data written by
 * someone we do not control: such a line is evidence of an attack, never an instruction. The line
 * is reported to the reader and stays in the data; the analysis does not follow it.
 */

const MAX_ATTEMPTS = 20;
const MAX_QUOTE_LENGTH = 300;

/** English and Italian phrases that address an AI model or its rules. */
const INJECTION_PATTERNS: RegExp[] = [
  /ignore (?:all |any |the )?(?:previous|prior|above|earlier)\s+(?:instructions?|rules?|prompts?)/i,
  /disregard (?:all |any |the )?(?:previous|prior|above|earlier)/i,
  /(?:reveal|print|show|leak|output) (?:me )?(?:your|the) (?:system )?(?:prompt|instructions|api[ _-]?key|secrets?)/i,
  /\byou are now\b/i,
  /\bnew instructions?\s*:/i,
  /\bsystem prompt\b/i,
  /(?:classify|rate|mark|report|answer)(?: this| it| the (?:log|incident))?(?: only)? as (?:informational|harmless|benign|critical|safe)/i,
  /<\|?(?:im_start|im_end|system|assistant)\|?>/i,
  /\b(?:ignora|dimentica)\s+(?:tutte\s+)?le\s+(?:istruzioni|regole)\s+precedenti/i,
  /\bnuove istruzioni\s*:/i,
];

export function looksLikeInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

export function findInjectionAttempts(events: NormalizedLogEvent[]): InjectionAttempt[] {
  const attempts: InjectionAttempt[] = [];
  for (const event of events) {
    if (attempts.length >= MAX_ATTEMPTS) {
      break;
    }
    if (!looksLikeInjection(event.raw)) {
      continue;
    }
    const firstLine = event.raw.split('\n', 1)[0].slice(0, MAX_QUOTE_LENGTH);
    attempts.push({
      eventId: event.eventId,
      lineStart: event.originalLineStart,
      quote: maskSecrets(firstLine).text,
    });
  }
  return attempts;
}
