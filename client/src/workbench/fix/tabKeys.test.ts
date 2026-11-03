import { describe, expect, it } from 'vitest';

import { nextTabIndex } from './tabKeys';

describe('nextTabIndex', () => {
  it('moves right and wraps around at the end', () => {
    expect(nextTabIndex('ArrowRight', 0, 4)).toBe(1);
    expect(nextTabIndex('ArrowRight', 3, 4)).toBe(0);
  });

  it('moves left and wraps around at the start', () => {
    expect(nextTabIndex('ArrowLeft', 2, 4)).toBe(1);
    expect(nextTabIndex('ArrowLeft', 0, 4)).toBe(3);
  });

  it('jumps to the first and the last tab', () => {
    expect(nextTabIndex('Home', 2, 4)).toBe(0);
    expect(nextTabIndex('End', 1, 4)).toBe(3);
  });

  it.each(['Enter', 'a', 'ArrowDown', 'Tab', ''])('ignores the key %j', (key) => {
    expect(nextTabIndex(key, 1, 4)).toBeNull();
  });

  it('does nothing without tabs', () => {
    expect(nextTabIndex('ArrowRight', 0, 0)).toBeNull();
  });
});
