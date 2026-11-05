import type { AnalysisRecord, Severity } from '../../../lib/types';
import { isUnsafeCode } from './escape';

export const ALERT_TARGET_IDS = ['prometheus', 'datadog', 'loki', 'sentry', 'cron'] as const;

export type AlertTargetId = (typeof ALERT_TARGET_IDS)[number];

export interface AlertSettings {
  /** Text the log lines must contain. Always passed through sanitizePattern before use. */
  pattern: string;
  /** Matches allowed inside the window before the alert fires. */
  threshold: number;
  windowMinutes: number;
  severity: Severity;
  /** Value of the `app` label that selects the log stream in Loki. */
  appName: string;
  /** Path of the log file the shell script reads. */
  logFile: string;
}

export const MAX_PATTERN_LENGTH = 80;
export const MIN_THRESHOLD = 1;
export const MAX_THRESHOLD = 10_000;
export const MIN_WINDOW_MINUTES = 1;
export const MAX_WINDOW_MINUTES = 1_440;
export const DEFAULT_APP_NAME = 'my-app';
export const DEFAULT_LOG_FILE = '/var/log/app.log';

const MAX_NAME_LENGTH = 120;
const SAFE_NAME = /[^A-Za-z0-9_./:-]/g;

function isHighSurrogate(character: string | undefined): boolean {
  const code = character?.charCodeAt(0) ?? 0;
  return code >= 0xd800 && code <= 0xdbff;
}

/**
 * Keeps one short, single-line piece of the text: control characters become spaces, runs of
 * spaces collapse, the length is capped. Quotes and symbols stay: the generators escape them.
 */
export function sanitizePattern(text: string): string {
  const singleLine = Array.from(text, (character) => {
    if (isUnsafeCode(character.charCodeAt(0))) {
      return ' ';
    }
    return character;
  }).join('');
  const capped = singleLine.replace(/\s+/g, ' ').trim().slice(0, MAX_PATTERN_LENGTH);
  let whole = capped;
  if (isHighSurrogate(capped.at(-1))) {
    whole = capped.slice(0, -1);
  }
  return whole.trim();
}

/** Only letters, digits and `_ . / : -` survive; an empty result becomes the fallback. */
export function sanitizeName(text: string, fallback: string): string {
  const cleaned = text.replace(SAFE_NAME, '').slice(0, MAX_NAME_LENGTH);
  if (cleaned === '') {
    return fallback;
  }
  return cleaned;
}

/** A whole number inside the limits; anything else (empty, text, NaN) becomes the fallback. */
export function clampWhole(value: number, minimum: number, maximum: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

export function normalizeSettings(settings: AlertSettings): AlertSettings {
  return {
    ...settings,
    pattern: sanitizePattern(settings.pattern),
    threshold: clampWhole(settings.threshold, MIN_THRESHOLD, MAX_THRESHOLD, 10),
    windowMinutes: clampWhole(settings.windowMinutes, MIN_WINDOW_MINUTES, MAX_WINDOW_MINUTES, 5),
    appName: sanitizeName(settings.appName, DEFAULT_APP_NAME),
    logFile: sanitizeName(settings.logFile, DEFAULT_LOG_FILE),
  };
}

/** The title of the analysis, or its first key line when the title is empty. */
export function defaultPatternFor(record: AnalysisRecord): string {
  return sanitizePattern(record.title || record.report.keyLines[0] || '');
}

export function defaultSettingsFor(record: AnalysisRecord): AlertSettings {
  return {
    pattern: defaultPatternFor(record),
    threshold: 10,
    windowMinutes: 5,
    severity: record.severity,
    appName: DEFAULT_APP_NAME,
    logFile: DEFAULT_LOG_FILE,
  };
}
