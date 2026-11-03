import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  sanitizePreferences,
  savePreferences,
} from './enginePreferences';

function memoryStorage(initial?: string) {
  let value: string | null = initial ?? null;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
    read: () => value,
  };
}

const THROWING = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

describe('engine preferences', () => {
  it('starts on the built-in engine with the default address', () => {
    expect(loadPreferences(memoryStorage())).toEqual(DEFAULT_PREFERENCES);
    expect(DEFAULT_PREFERENCES).toMatchObject({
      kind: 'builtin',
      baseUrl: 'http://localhost:11434',
    });
  });

  it('saves and loads the choice', () => {
    const storage = memoryStorage();
    const choice = {
      kind: 'ollama' as const,
      baseUrl: 'http://localhost:11435',
      model: 'llama3.2:3b',
    };
    expect(savePreferences(storage, choice)).toBe(true);
    expect(loadPreferences(storage)).toEqual(choice);
  });

  it('works without storage and when storage throws', () => {
    expect(loadPreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(savePreferences(null, DEFAULT_PREFERENCES)).toBe(false);
    expect(loadPreferences(THROWING)).toEqual(DEFAULT_PREFERENCES);
    expect(savePreferences(THROWING, DEFAULT_PREFERENCES)).toBe(false);
  });

  it('falls back to the defaults for stored text that is not JSON', () => {
    expect(loadPreferences(memoryStorage('{broken'))).toEqual(DEFAULT_PREFERENCES);
  });

  it.each([null, 5, 'text', [], { kind: 'cloud' }])('rejects the stored value %j', (value) => {
    expect(sanitizePreferences(value).kind).toBe('builtin');
  });

  it('replaces an unsafe address with the default and caps the model name', () => {
    const result = sanitizePreferences({
      kind: 'ollama',
      baseUrl: 'javascript:alert(1)',
      model: 'm'.repeat(1_000),
    });
    expect(result.baseUrl).toBe('http://localhost:11434');
    expect(result.model).toHaveLength(200);
    expect(result.kind).toBe('ollama');
  });
});
