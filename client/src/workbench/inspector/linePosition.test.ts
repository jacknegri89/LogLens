import { describe, expect, it } from 'vitest';

import { parseLines } from '../core/basicParse';
import { findLinePosition, neighbourLine } from './linePosition';

// The blank lines make line indexes skip numbers: 0, 2, 3, 6.
const lines = parseLines('first\n\nthird\nfourth\n\n\nseventh');

describe('findLinePosition', () => {
  it('finds a line by its original index', () => {
    expect(lines.map((line) => line.index)).toEqual([0, 2, 3, 6]);
    expect(findLinePosition(lines, 3)).toBe(2);
    expect(findLinePosition(lines, 0)).toBe(0);
    expect(findLinePosition(lines, 6)).toBe(3);
  });

  it('returns -1 for a blank, missing or negative index', () => {
    expect(findLinePosition(lines, 1)).toBe(-1);
    expect(findLinePosition(lines, 99)).toBe(-1);
    expect(findLinePosition(lines, -1)).toBe(-1);
    expect(findLinePosition([], 0)).toBe(-1);
  });
});

describe('neighbourLine', () => {
  it('skips blank lines', () => {
    expect(neighbourLine(lines, 0, 1)?.index).toBe(2);
    expect(neighbourLine(lines, 6, -1)?.index).toBe(3);
  });

  it('is null at the ends and for an unknown line', () => {
    expect(neighbourLine(lines, 0, -1)).toBeNull();
    expect(neighbourLine(lines, 6, 1)).toBeNull();
    expect(neighbourLine(lines, 1, 1)).toBeNull();
  });
});
