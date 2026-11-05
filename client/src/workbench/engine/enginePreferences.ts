import { DEFAULT_OLLAMA_URL, normalizeBaseUrl } from './ollamaClient';

export type EngineKind = 'builtin' | 'ollama';

export interface EnginePreferences {
  kind: EngineKind;
  baseUrl: string;
  model: string;
}

export const DEFAULT_PREFERENCES: EnginePreferences = {
  kind: 'builtin',
  baseUrl: DEFAULT_OLLAMA_URL,
  model: '',
};

const STORAGE_KEY = 'loglens.ask.engine';
const MAX_MODEL_LENGTH = 200;

type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'> | null;

/** The local storage of the browser, or null when it is blocked. */
export function preferenceStorage(): PreferenceStorage {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Keeps only valid values from whatever was stored; the rest falls back to the defaults. */
export function sanitizePreferences(value: unknown): EnginePreferences {
  let saved: Record<string, unknown> = {};
  if (typeof value === 'object' && value !== null) {
    saved = value as Record<string, unknown>;
  }
  let baseUrl: string | null = null;
  if (typeof saved.baseUrl === 'string') {
    baseUrl = normalizeBaseUrl(saved.baseUrl);
  }
  let model = '';
  if (typeof saved.model === 'string') {
    model = saved.model.slice(0, MAX_MODEL_LENGTH);
  }
  let kind: EngineKind = 'builtin';
  if (saved.kind === 'ollama') {
    kind = 'ollama';
  }
  return {
    kind,
    baseUrl: baseUrl ?? DEFAULT_PREFERENCES.baseUrl,
    model,
  };
}

export function loadPreferences(storage: PreferenceStorage): EnginePreferences {
  try {
    const saved = storage?.getItem(STORAGE_KEY);
    if (saved) {
      return sanitizePreferences(JSON.parse(saved));
    }
    return DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/** Returns false when the browser refused to store the choice (it then lasts for this visit only). */
export function savePreferences(
  storage: PreferenceStorage,
  preferences: EnginePreferences,
): boolean {
  try {
    if (!storage) {
      return false;
    }
    storage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}
