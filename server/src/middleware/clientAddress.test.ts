import { describe, expect, it } from 'vitest';

import { clientAddress } from './clientAddress';

describe('clientAddress', () => {
  it('uses the socket address when no proxy is trusted, ignoring a forged header', () => {
    expect(clientAddress('1.2.3.4', '10.0.0.5', false)).toBe('10.0.0.5');
  });

  it('uses the socket address when the header is missing', () => {
    expect(clientAddress(undefined, '10.0.0.5', true)).toBe('10.0.0.5');
  });

  it('takes the last forwarded entry, the one the nearest proxy appended', () => {
    expect(clientAddress('6.6.6.6, 198.51.100.7', '10.0.0.5', true)).toBe('198.51.100.7');
  });

  it('falls back to the socket address when the header holds only blanks', () => {
    expect(clientAddress(' , ', '10.0.0.5', true)).toBe('10.0.0.5');
  });
});
