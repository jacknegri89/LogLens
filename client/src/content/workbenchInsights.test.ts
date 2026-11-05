import { describe, expect, it } from 'vitest';

import { LANGUAGES } from '../i18n/languages';
import { INSIGHTS_TEXT } from './workbenchInsights';

function shapeOf(value: unknown): unknown {
  if (typeof value === 'function') {
    return 'function';
  }
  if (typeof value === 'string') {
    return 'string';
  }
  if (Array.isArray(value)) {
    return value.map(shapeOf);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, shapeOf(inner)]));
  }
  return typeof value;
}

function stringsOf(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  if (!value || typeof value !== 'object') {
    return [];
  }
  return Object.values(value).flatMap(stringsOf);
}

describe('INSIGHTS_TEXT', () => {
  it('has the same keys in every language', () => {
    const [first, ...others] = LANGUAGES;
    for (const language of others) {
      expect(shapeOf(INSIGHTS_TEXT[language])).toEqual(shapeOf(INSIGHTS_TEXT[first]));
    }
  });

  it('has no empty text', () => {
    for (const language of LANGUAGES) {
      stringsOf(INSIGHTS_TEXT[language]).forEach((text) => expect(text.trim()).not.toBe(''));
    }
  });

  it('writes the ranges and the pluralised details in both languages', () => {
    for (const language of LANGUAGES) {
      const text = INSIGHTS_TEXT[language];
      expect(text.mttr.range(20, 60)).toBe('20-60 min');
      expect(text.risk.factorDetails.findings(1)).toContain('1 ');
      expect(text.risk.factorDetails.findings(3)).toContain('3 ');
    }
  });
});
