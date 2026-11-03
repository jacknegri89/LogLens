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
  const saved = (typeof value === 'object' && value !== null ? value : {}) as Record<
    string,
    unknown
  >;
  const baseUrl = typeof saved.baseUrl === 'string' ? normalizeBaseUrl(saved.baseUrl) : null;
  const model = typeof saved.model === 'string' ? saved.model.slice(0, MAX_MODEL_LENGTH) : '';
  return {
    kind: saved.kind === 'ollama' ? 'ollama' : 'builtin',
    baseUrl: baseUrl ?? DEFAULT_PREFERENCES.baseUrl,
    model,
  };
}

export function loadPreferences(storage: PreferenceStorage): EnginePreferences {
  try {
    const saved = storage?.getItem(STORAGE_KEY);
    return saved ? sanitizePreferences(JSON.parse(saved)) : DEFAULT_PREFERENCES;
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
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}
