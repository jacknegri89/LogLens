import { describe, expect, it } from 'vitest';

import { LANGUAGES } from '../i18n/languages';
import { routeIntent } from '../workbench/engine/intents';
import { SCENARIO_IDS } from '../workbench/fix/remediation/types';
import { ASK_TEXT } from './workbenchAsk';
import { FIX_TEXT } from './workbenchFix';

const TABLES = { FIX_TEXT, ASK_TEXT };

/** The shape of a value: objects by key, arrays by length, strings by kind. */
function shapeOf(value: unknown): unknown {
  if (typeof value === 'string') return 'string';
  if (Array.isArray(value)) return value.map(shapeOf);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, shapeOf(inner)]));
  }
  return typeof value;
}

function stringsOf(value: unknown, path: string): [string, string][] {
  if (typeof value === 'string') return [[path, value]];
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, inner]) => stringsOf(inner, `${path}.${key}`));
}

describe('Fix and Ask text tables', () => {
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

  it.each(LANGUAGES)('describes every remediation scenario in %s', (language) => {
    expect(Object.keys(FIX_TEXT[language].scenarios).sort()).toEqual([...SCENARIO_IDS].sort());
  });

  it.each(Object.entries(TABLES))(
    '%s keeps the same placeholders in both languages',
    (name, table) => {
      const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join(',');
      const italian = new Map(stringsOf(table.it, name));
      for (const [path, text] of stringsOf(table.en, name)) {
        expect(placeholders(italian.get(path) ?? ''), path).toBe(placeholders(text));
      }
    },
  );
});

describe.each(LANGUAGES)('quick questions in %s', (language) => {
  const { items } = ASK_TEXT[language].prompts;

  it('has at least six', () => {
    expect(items.length).toBeGreaterThanOrEqual(6);
  });

  it('routes each one to the intent it is meant for', () => {
    for (const item of items) expect(routeIntent(item.question), item.question).toBe(item.intent);
  });
});
