import { describe, expect, it } from 'vitest';

import { LANGUAGES } from '../i18n/languages';
import { ANALYZE_TEXT } from './analyze';
import { DETAIL_TEXT } from './detail';
import { ERROR_TEXT, LOST_PAGE_TEXT } from './errors';
import { EXAMPLES, EXAMPLES_TEXT } from './examples';
import { FEEDBACK_TEXT } from './feedback';
import { HISTORY_TEXT } from './history';
import { LAYOUT_TEXT } from './layout';
import { REPORT_TEXT } from './report';
import { SHARE_TEXT } from './share';
import { SHARED_PAGE_TEXT } from './sharedPage';
import { STREAM_TEXT } from './stream';

const TABLES = {
  ANALYZE_TEXT,
  DETAIL_TEXT,
  ERROR_TEXT,
  LOST_PAGE_TEXT,
  EXAMPLES_TEXT,
  FEEDBACK_TEXT,
  HISTORY_TEXT,
  LAYOUT_TEXT,
  REPORT_TEXT,
  SHARE_TEXT,
  SHARED_PAGE_TEXT,
  STREAM_TEXT,
};

/** The shape of a value: objects by key, arrays by length, functions and strings by kind. */
function shapeOf(value: unknown): unknown {
  if (typeof value === 'function') return 'function';
  if (typeof value === 'string') return 'string';
  if (Array.isArray(value)) return value.map(shapeOf);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, shapeOf(inner)]));
  }
  return typeof value;
}

/** Every string of a table, with the path to it, so an empty one can be named. */
function stringsOf(value: unknown, path: string): [string, string][] {
  if (typeof value === 'string') return [[path, value]];
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, inner]) => stringsOf(inner, `${path}.${key}`));
}

describe('text tables', () => {
  it.each(Object.entries(TABLES))('%s has the same keys in every language', (_name, table) => {
    const [first, ...others] = LANGUAGES;
    for (const language of others) {
      expect(shapeOf(table[language])).toEqual(shapeOf(table[first]));
    }
  });

  it.each(Object.entries(TABLES))('%s has no empty text', (name, table) => {
    for (const language of LANGUAGES) {
      for (const [path, text] of stringsOf(table[language], `${name}.${language}`)) {
        expect(text.trim(), path).not.toBe('');
      }
    }
  });

  it('names every sample log in every language', () => {
    for (const language of LANGUAGES) {
      for (const example of EXAMPLES) {
        expect(EXAMPLES_TEXT[language].names[example.id]).toBeTruthy();
      }
    }
  });
});

describe('Italian texts', () => {
  it('uses the Italian severity labels', () => {
    expect(REPORT_TEXT.it.severityLabels).toEqual({
      critical: 'Critica',
      high: 'Alta',
      medium: 'Media',
      low: 'Bassa',
      informational: 'Informativa',
    });
  });

  it('writes plurals for counts of lines', () => {
    expect(ANALYZE_TEXT.it.fileChipLines(1)).toBe('1 riga');
    expect(ANALYZE_TEXT.it.fileChipLines(12)).toBe('12 righe');
    expect(ANALYZE_TEXT.en.fileChipLines(1)).toBe('1 line');
    expect(ANALYZE_TEXT.en.fileChipLines(12)).toBe('12 lines');
    expect(REPORT_TEXT.it.showMarkdown(1)).toBe('Mostra markdown (1 riga)');
  });

  it('writes the anonymized notice with the right plurals', () => {
    const replaced = { IP: 3, EMAIL: 1, SECRET: 1, USER: 2 };
    expect(ANALYZE_TEXT.en.anonymizedNotice(replaced)).toBe(
      'Anonymized: 3 IPs, 1 e-mail, 1 secret, 2 user names replaced',
    );
    expect(ANALYZE_TEXT.it.anonymizedNotice(replaced)).toBe(
      'Dati sostituiti: 3 IP, 1 e-mail, 1 segreto, 2 nomi utente',
    );
  });

  it('says so when nothing was anonymized', () => {
    expect(ANALYZE_TEXT.en.anonymizedNotice({})).toBe('Anonymize was on: nothing sensitive found.');
    expect(ANALYZE_TEXT.it.anonymizedNotice({})).toContain('nessun dato sensibile');
  });
});
