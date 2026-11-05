import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearLocalAnalyses,
  getLocalAnalysis,
  listLocalAnalyses,
  MAX_LOCAL_ANALYSES,
  MAX_LOCAL_LOG_CHARACTERS,
  removeLocalAnalysis,
  saveLocalAnalysis,
} from './localHistory';
import type { AnalysisRecord } from './types';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

function makeRecord(index: number, rawLog = 'ERROR boom'): AnalysisRecord {
  return {
    id: `analysis-${index}`,
    createdAt: new Date(2026, 0, 1, 0, index).toISOString(),
    source: 'paste',
    fileName: null,
    rawLog,
    title: `Analysis ${index}`,
    severity: 'high',
    category: 'database',
    report: { keyLines: [], causes: [], debugSteps: [], bugReportMarkdown: '' },
    helpful: null,
    shareToken: null,
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('localHistory', () => {
  it('lists the newest analysis first, as history rows without the log', () => {
    saveLocalAnalysis(makeRecord(1));
    saveLocalAnalysis(makeRecord(2));

    const items = listLocalAnalyses();
    expect(items.map((item) => item.id)).toEqual(['analysis-2', 'analysis-1']);
    expect(items[0]).not.toHaveProperty('rawLog');
  });

  it('returns a saved analysis with its whole report, and null for an unknown id', () => {
    saveLocalAnalysis(makeRecord(1));
    expect(getLocalAnalysis('analysis-1')?.title).toBe('Analysis 1');
    expect(getLocalAnalysis('missing')).toBeNull();
  });

  it('saves the same analysis once', () => {
    saveLocalAnalysis(makeRecord(1));
    saveLocalAnalysis(makeRecord(1));
    expect(listLocalAnalyses()).toHaveLength(1);
  });

  it('keeps at most 30 analyses and drops the oldest', () => {
    for (let index = 1; index <= MAX_LOCAL_ANALYSES + 5; index += 1) {
      saveLocalAnalysis(makeRecord(index));
    }
    const items = listLocalAnalyses();
    expect(items).toHaveLength(MAX_LOCAL_ANALYSES);
    expect(items[0].id).toBe('analysis-35');
    expect(getLocalAnalysis('analysis-1')).toBeNull();
  });

  it('cuts a long log and flags it, but leaves a short one alone', () => {
    saveLocalAnalysis(makeRecord(1, 'x'.repeat(MAX_LOCAL_LOG_CHARACTERS + 10)));
    saveLocalAnalysis(makeRecord(2));

    const long = getLocalAnalysis('analysis-1');
    expect(long?.rawLog).toHaveLength(MAX_LOCAL_LOG_CHARACTERS);
    expect(long?.logTruncated).toBe(true);
    expect(getLocalAnalysis('analysis-2')?.logTruncated).toBeUndefined();
  });

  it('removes one analysis or all of them', () => {
    saveLocalAnalysis(makeRecord(1));
    saveLocalAnalysis(makeRecord(2));

    removeLocalAnalysis('analysis-1');
    expect(listLocalAnalyses().map((item) => item.id)).toEqual(['analysis-2']);

    clearLocalAnalyses();
    expect(listLocalAnalyses()).toEqual([]);
  });

  it('ignores damaged stored data', () => {
    localStorage.setItem('loglens-local-history', '{not json');
    expect(listLocalAnalyses()).toEqual([]);
    saveLocalAnalysis(makeRecord(1));
    expect(listLocalAnalyses()).toHaveLength(1);
  });

  it('drops the oldest analyses when the storage is full', () => {
    const storage = new MemoryStorage();
    storage.setItem = (key: string, value: string) => {
      if (value.length > 700) {
        throw new DOMException('full', 'QuotaExceededError');
      }
      MemoryStorage.prototype.setItem.call(storage, key, value);
    };
    vi.stubGlobal('localStorage', storage);

    for (let index = 1; index <= 5; index += 1) saveLocalAnalysis(makeRecord(index));

    const items = listLocalAnalyses();
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThan(5);
    expect(items[0].id).toBe('analysis-5');
  });

  it('does not throw when the storage is blocked', () => {
    const blocked = () => {
      throw new DOMException('blocked', 'SecurityError');
    };
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked, removeItem: blocked });

    expect(() => saveLocalAnalysis(makeRecord(1))).not.toThrow();
    expect(listLocalAnalyses()).toEqual([]);
    expect(getLocalAnalysis('analysis-1')).toBeNull();
    expect(() => removeLocalAnalysis('analysis-1')).not.toThrow();
    expect(() => clearLocalAnalyses()).not.toThrow();
  });
});
