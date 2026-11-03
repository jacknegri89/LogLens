import { describe, expect, it } from 'vitest';

import { nextTabIndex } from './tabKeys';

describe('nextTabIndex', () => {
  it('moves right and left and wraps around', () => {
    expect(nextTabIndex(0, 'ArrowRight', 3)).toBe(1);
    expect(nextTabIndex(2, 'ArrowRight', 3)).toBe(0);
    expect(nextTabIndex(0, 'ArrowLeft', 3)).toBe(2);
    expect(nextTabIndex(2, 'ArrowLeft', 3)).toBe(1);
  });

  it('jumps to the first and last tab', () => {
    expect(nextTabIndex(1, 'Home', 3)).toBe(0);
    expect(nextTabIndex(1, 'End', 3)).toBe(2);
  });

  it('ignores other keys and an empty list', () => {
    expect(nextTabIndex(1, 'Enter', 3)).toBeNull();
    expect(nextTabIndex(0, 'ArrowRight', 0)).toBeNull();
  });
});
