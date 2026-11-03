import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyStoredTheme,
  isContrastActive,
  isContrastStored,
  setContrastTheme,
} from './contrastTheme';

let store: Map<string, string>;
let dataset: Record<string, string | undefined>;

beforeEach(() => {
  store = new Map();
  dataset = {};
  vi.stubGlobal('document', { documentElement: { dataset } });
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('contrast theme', () => {
  it('turns on, remembers and turns off', () => {
    setContrastTheme(true);
    expect(isContrastActive()).toBe(true);
    expect(isContrastStored()).toBe(true);
    setContrastTheme(false);
    expect(isContrastActive()).toBe(false);
    expect(isContrastStored()).toBe(false);
    expect('theme' in dataset).toBe(false);
  });

  it('applies a saved choice and leaves the default look when nothing is saved', () => {
    applyStoredTheme();
    expect(isContrastActive()).toBe(false);
    store.set('loglens-theme', 'contrast');
    applyStoredTheme();
    expect(isContrastActive()).toBe(true);
  });

  it('ignores any other saved value', () => {
    store.set('loglens-theme', 'purple');
    expect(isContrastStored()).toBe(false);
  });

  it('still works on the page when storage is blocked', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    });
    expect(isContrastStored()).toBe(false);
    expect(() => setContrastTheme(true)).not.toThrow();
    expect(isContrastActive()).toBe(true);
  });
});
