import { describe, expect, it } from 'vitest';

import { LANGUAGES } from '../i18n/languages';
import { EXPORT_TEXT } from './workbenchExport';
import { PALETTE_TEXT } from './workbenchPalette';
import { SECURITY_TEXT } from './workbenchSecurity';

const TABLES = { SECURITY_TEXT, EXPORT_TEXT, PALETTE_TEXT };

function shapeOf(value: unknown): unknown {
  if (typeof value === 'function') return 'function';
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

describe('security, export and palette texts', () => {
  it.each(Object.entries(TABLES))('%s has the same keys in both languages', (_name, table) => {
    expect(shapeOf(table.it)).toEqual(shapeOf(table.en));
  });

  it.each(Object.entries(TABLES))('%s has no empty text', (name, table) => {
    for (const language of LANGUAGES) {
      for (const [path, text] of stringsOf(table[language], `${name}.${language}`)) {
        expect(text.trim(), path).not.toBe('');
      }
    }
  });

  it('writes the sanitized count with the right plural in both languages', () => {
    expect(SECURITY_TEXT.en.scrub.done(1)).toBe('1 item sanitized');
    expect(SECURITY_TEXT.en.scrub.done(12)).toBe('12 items sanitized');
    expect(SECURITY_TEXT.it.scrub.done(1)).toBe('1 elemento oscurato');
    expect(SECURITY_TEXT.it.scrub.done(12)).toBe('12 elementi oscurati');
  });

  it('writes the alert line with and without addresses', () => {
    expect(SECURITY_TEXT.en.panel.alert(7, 3)).toBe('7 attack signals from 3 addresses');
    expect(SECURITY_TEXT.en.panel.alert(1, 1)).toBe('1 attack signal from 1 address');
    expect(SECURITY_TEXT.en.panel.alert(2, 0)).toBe('2 attack signals');
    expect(SECURITY_TEXT.it.panel.alert(7, 3)).toBe('7 segnali di attacco da 3 indirizzi');
  });
});
