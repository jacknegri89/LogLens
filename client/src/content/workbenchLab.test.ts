import { describe, expect, it } from 'vitest';

import { LANGUAGES } from '../i18n/languages';
import { EXTRACTORS } from '../workbench/lab/regex/extractors';
import { SCENARIO_KINDS } from '../workbench/lab/tail/scenarios';
import { LAB_TEXT, LIVE_TAIL_TEXT } from './workbenchLab';

/** The shape of a value: objects by key, functions and strings by kind. */
function shapeOf(value: unknown): unknown {
  if (typeof value === 'function') {
    return 'function';
  }
  if (typeof value === 'string') {
    return 'string';
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, shapeOf(inner)]));
  }
  return typeof value;
}

function stringsOf(value: unknown, path: string): Array<[string, string]> {
  if (typeof value === 'string') {
    return [[path, value]];
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, inner]) => stringsOf(inner, `${path}.${key}`));
  }
  return [];
}

describe.each([
  ['LAB_TEXT', LAB_TEXT],
  ['LIVE_TAIL_TEXT', LIVE_TAIL_TEXT],
])('%s', (name, table) => {
  it('has the same keys in every language', () => {
    const [first, ...others] = LANGUAGES;
    for (const language of others) {
      expect(shapeOf(table[language])).toEqual(shapeOf(table[first]));
    }
  });

  it('has no empty text', () => {
    for (const language of LANGUAGES) {
      for (const [path, text] of stringsOf(table[language], `${name}.${language}`)) {
        expect(text.trim(), path).not.toBe('');
      }
    }
  });
});

describe('Lab texts', () => {
  it('names every quick extract and every scenario', () => {
    for (const language of LANGUAGES) {
      for (const extractor of EXTRACTORS) {
        expect(LAB_TEXT[language].regex.extractors[extractor.id]).toBeTruthy();
      }
      for (const kind of SCENARIO_KINDS) {
        expect(LIVE_TAIL_TEXT[language].scenarios[kind]).toBeTruthy();
      }
    }
  });

  it('writes counts with the right plurals in both languages', () => {
    expect(LAB_TEXT.en.regex.summary(1, 1)).toBe('1 match in 1 line');
    expect(LAB_TEXT.en.regex.summary(5, 3)).toBe('5 matches in 3 lines');
    expect(LAB_TEXT.it.regex.summary(1, 1)).toBe('1 corrispondenza in 1 riga');
    expect(LAB_TEXT.it.regex.summary(5, 3)).toBe('5 corrispondenze in 3 righe');
  });

  it('says on which line the fatal error was intercepted', () => {
    expect(LIVE_TAIL_TEXT.en.fatalIntercepted(87)).toBe('Fatal line intercepted at line 87');
    expect(LIVE_TAIL_TEXT.it.fatalIntercepted(87)).toContain('87');
  });
});
