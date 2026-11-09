import { describe, expect, it } from 'vitest';

import { normalizeLog, withoutTerminalNoise } from './normalizeLog';

const BYTE_ORDER_MARK = String.fromCharCode(0xfeff);
const ESCAPE = String.fromCharCode(0x1b);

describe('withoutTerminalNoise', () => {
  it('removes a byte order mark at the start of the text, and only there', () => {
    const text = `${BYTE_ORDER_MARK}2026-11-04T10:00:00Z ERROR boom`;

    expect(withoutTerminalNoise(text)).toBe('2026-11-04T10:00:00Z ERROR boom');
    expect(withoutTerminalNoise('FEFF stays')).toBe('FEFF stays');
  });

  it('removes colour codes', () => {
    const text = `${ESCAPE}[31mERROR${ESCAPE}[0m boom`;

    expect(withoutTerminalNoise(text)).toBe('ERROR boom');
  });

  it('lets the first line of a file with a byte order mark keep its time and level', () => {
    const log = `${BYTE_ORDER_MARK}2026-11-04T10:00:00Z ERROR boom`;

    const [first] = normalizeLog(log).events;

    expect(first.level).toBe('error');
    expect(first.timestamp).not.toBeNull();
  });
});
