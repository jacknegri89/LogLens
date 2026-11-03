import { describe, expect, it } from 'vitest';

import { readTextFile } from './readTextFile';

describe('readTextFile', () => {
  it('reads the text of a small file', async () => {
    const file = new File(['INFO ok\nERROR boom'], 'a.log');
    expect(await readTextFile(file, 1024)).toEqual({ ok: true, text: 'INFO ok\nERROR boom' });
  });

  it('refuses a file above the limit without reading it', async () => {
    const file = new File(['0123456789'], 'big.log');
    expect(await readTextFile(file, 5)).toEqual({ ok: false, reason: 'tooBig' });
  });

  it('accepts a file exactly at the limit', async () => {
    const file = new File(['12345'], 'edge.log');
    expect((await readTextFile(file, 5)).ok).toBe(true);
  });

  it('reports a file that cannot be read', async () => {
    const broken = { size: 1, text: () => Promise.reject(new Error('denied')) } as unknown as File;
    expect(await readTextFile(broken, 10)).toEqual({ ok: false, reason: 'unreadable' });
  });
});
