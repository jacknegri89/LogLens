import { describe, expect, it } from 'vitest';

import { isSmallLog, parseInBackground } from './backgroundParse';

describe('isSmallLog', () => {
  it('accepts a log under the limit', () => {
    expect(isSmallLog('')).toBe(true);
    expect(isSmallLog('a\nb\nc', 4)).toBe(true);
  });

  it('refuses a log that reaches the limit', () => {
    expect(isSmallLog('a\nb\nc\nd', 4)).toBe(false);
    expect(isSmallLog('x\n'.repeat(5000))).toBe(false);
  });

  it('uses a worker for a large log even when it contains only one line', () => {
    expect(isSmallLog('x'.repeat(100_001))).toBe(false);
  });
});

describe('parseInBackground without a Worker', () => {
  it('falls back to the main thread and delivers the lines once', async () => {
    const lines = await new Promise<unknown[]>((resolve) => {
      parseInBackground('INFO one\nERROR two', resolve);
    });

    expect(lines).toHaveLength(2);
  });

  it('never delivers after being cancelled', async () => {
    let delivered = false;
    const cancel = parseInBackground('INFO one', () => {
      delivered = true;
    });
    cancel();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(delivered).toBe(false);
  });
});
