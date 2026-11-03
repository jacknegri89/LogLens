import { describe, expect, it } from 'vitest';

import type { AnalysisRecord } from '../../../lib/types';
import {
  clampWhole,
  defaultPatternFor,
  defaultSettingsFor,
  MAX_PATTERN_LENGTH,
  normalizeSettings,
  sanitizeName,
  sanitizePattern,
} from './settings';

function record(title: string, keyLines: string[] = []): AnalysisRecord {
  return { title, severity: 'high', report: { keyLines } } as unknown as AnalysisRecord;
}

describe('sanitizePattern', () => {
  it('keeps a normal title untouched', () => {
    expect(sanitizePattern('connect ECONNREFUSED 10.0.2.15:5432')).toBe(
      'connect ECONNREFUSED 10.0.2.15:5432',
    );
  });

  it('turns line breaks and control characters into single spaces', () => {
    expect(sanitizePattern('first\nsecond\r\n\tthird\u0000fourth fifth')).toBe(
      'first second third fourth fifth',
    );
  });

  it('keeps quotes and shell symbols, which the generators escape', () => {
    expect(sanitizePattern('"; rm -rf / #')).toBe('"; rm -rf / #');
  });

  it('caps the length', () => {
    expect(sanitizePattern('x'.repeat(500))).toHaveLength(MAX_PATTERN_LENGTH);
  });

  it('never cuts an emoji in half', () => {
    const cut = sanitizePattern('a'.repeat(MAX_PATTERN_LENGTH - 1) + '😀😀');
    expect(cut).toBe('a'.repeat(MAX_PATTERN_LENGTH - 1));
  });

  it('returns an empty text for blank input', () => {
    expect(sanitizePattern(' \n\t ')).toBe('');
  });
});

describe('sanitizeName', () => {
  it('keeps letters, digits and path characters', () => {
    expect(sanitizeName('/var/log/my-app.log', 'x')).toBe('/var/log/my-app.log');
  });

  it('drops quotes, spaces and shell symbols', () => {
    expect(sanitizeName("a b';$(id)`c`", 'x')).toBe('abidc');
  });

  it('uses the fallback when nothing is left', () => {
    expect(sanitizeName('"; ', 'my-app')).toBe('my-app');
  });
});

describe('clampWhole', () => {
  it('rounds and limits a number', () => {
    expect(clampWhole(3.6, 1, 10, 5)).toBe(4);
    expect(clampWhole(0, 1, 10, 5)).toBe(1);
    expect(clampWhole(99, 1, 10, 5)).toBe(10);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])('uses the fallback for %s', (value) => {
    expect(clampWhole(value, 1, 10, 5)).toBe(5);
  });
});

describe('normalizeSettings', () => {
  it('cleans every field of the settings', () => {
    const settings = normalizeSettings({
      ...defaultSettingsFor(record('title')),
      pattern: 'a\nb',
      threshold: -4,
      windowMinutes: 99_999,
      appName: '"x"',
      logFile: '',
    });
    expect(settings).toMatchObject({
      pattern: 'a b',
      threshold: 1,
      windowMinutes: 1_440,
      appName: 'x',
      logFile: '/var/log/app.log',
    });
  });
});

describe('defaultPatternFor', () => {
  it('uses the title of the analysis', () => {
    expect(defaultPatternFor(record('Disk full', ['line']))).toBe('Disk full');
  });

  it('falls back to the first key line, and to an empty text', () => {
    expect(defaultPatternFor(record('', ['ERROR boom']))).toBe('ERROR boom');
    expect(defaultPatternFor(record('', []))).toBe('');
  });
});
