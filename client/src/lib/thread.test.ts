import { describe, expect, it } from 'vitest';

import { hasSetAsideEntries, threadLinks, threadPath } from './thread';
import type { TimelineEntry } from './types';

function entry(role: TimelineEntry['role'], causedBy?: number): TimelineEntry {
  return { title: 't', category: 'c', severity: 'high', role, evidence: 'e', causedBy };
}

describe('threadLinks', () => {
  it('ties each effect to the root it names', () => {
    const entries = [entry('root'), entry('effect', 0), entry('independent'), entry('effect', 0)];
    expect(threadLinks(entries)).toEqual([
      { rootIndex: 0, effectIndex: 1 },
      { rootIndex: 0, effectIndex: 3 },
    ]);
  });

  it('draws nothing for an index that is out of range or does not point at a root', () => {
    const entries = [entry('root'), entry('effect', 7), entry('effect', 1), entry('effect')];
    expect(threadLinks(entries)).toEqual([]);
  });
});

describe('hasSetAsideEntries', () => {
  it('is true only when a chain and an unlinked event are both on the board', () => {
    expect(hasSetAsideEntries([entry('root'), entry('effect', 0), entry('independent')])).toBe(
      true,
    );
    expect(hasSetAsideEntries([entry('independent'), entry('independent')])).toBe(false);
    expect(hasSetAsideEntries([entry('root'), entry('effect', 0)])).toBe(false);
  });
});

describe('threadPath', () => {
  it('starts and ends at the two pins and droops below them', () => {
    const path = threadPath({ x: 10, y: 20 }, { x: 210, y: 20 });
    expect(path).toBe('M10 20 Q110 54 210 20');
  });

  it('bows a vertical thread sideways instead of drawing a straight rule', () => {
    const path = threadPath({ x: 100, y: 0 }, { x: 100, y: 400 });
    expect(path).toBe('M100 0 Q46 216.2 100 400');
  });
});
