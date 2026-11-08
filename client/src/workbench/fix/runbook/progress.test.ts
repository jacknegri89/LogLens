import { describe, expect, it } from 'vitest';

import { completedPercent, loadDoneSteps, saveDoneSteps, toggledStep } from './progress';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

const BLOCKED = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};

describe('completedPercent', () => {
  it('rounds to a whole number', () => {
    expect(completedPercent(1, 3)).toBe(33);
    expect(completedPercent(2, 3)).toBe(67);
    expect(completedPercent(4, 4)).toBe(100);
  });

  it('is 0 without steps and never above 100', () => {
    expect(completedPercent(0, 0)).toBe(0);
    expect(completedPercent(5, 4)).toBe(100);
    expect(completedPercent(-1, 4)).toBe(0);
  });
});

describe('toggledStep', () => {
  it('adds a step that is not done and removes one that is', () => {
    const added = toggledStep(new Set([1]), 2);
    expect([...added].sort()).toEqual([1, 2]);
    expect([...toggledStep(added, 1)]).toEqual([2]);
  });

  it('does not change the set it receives', () => {
    const original = new Set([1]);
    toggledStep(original, 5);
    expect([...original]).toEqual([1]);
  });
});

describe('saved progress', () => {
  it('saves and loads the done steps of one analysis', () => {
    const storage = memoryStorage();
    expect(saveDoneSteps(storage, 'a1', new Set([2, 0]))).toBe(true);
    expect([...loadDoneSteps(storage, 'a1', 4)]).toEqual([0, 2]);
    expect(loadDoneSteps(storage, 'other', 4).size).toBe(0);
  });

  it('removes the entry when nothing is done', () => {
    const storage = memoryStorage();
    saveDoneSteps(storage, 'a1', new Set([1]));
    saveDoneSteps(storage, 'a1', new Set());
    expect(storage.data.size).toBe(0);
  });

  it.each(['not json', '{"a":1}', '"text"', 'null', '[1.5, "x", -1, 99, 2]'])(
    'ignores a broken or out-of-range value (%s)',
    (saved) => {
      const storage = memoryStorage({ 'loglens.runbook.a1': saved });
      const loaded = loadDoneSteps(storage, 'a1', 4);
      let expectedLoaded: number[] = [];
      if (saved.includes('2]')) {
        expectedLoaded = [2];
      }
      expect([...loaded]).toEqual(expectedLoaded);
    },
  );

  it('works without storage and when storage throws', () => {
    expect(loadDoneSteps(null, 'a1', 4).size).toBe(0);
    expect(saveDoneSteps(null, 'a1', new Set([1]))).toBe(false);
    expect(loadDoneSteps(BLOCKED, 'a1', 4).size).toBe(0);
    expect(saveDoneSteps(BLOCKED, 'a1', new Set([1]))).toBe(false);
  });
});
