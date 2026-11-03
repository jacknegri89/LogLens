import { describe, expect, it } from 'vitest';

import {
  canonicalAddress,
  extractAddress,
  isBlockableAddress,
  isValidIpv4,
  isValidIpv6,
} from './address';

describe('isValidIpv4', () => {
  it.each(['0.0.0.0', '1.2.3.4', '203.0.113.9', '255.255.255.255'])('accepts %s', (value) => {
    expect(isValidIpv4(value)).toBe(true);
  });

  it.each([
    '256.1.1.1',
    '1.2.3',
    '1.2.3.4.5',
    '01.2.3.4',
    '1.2.3.4; rm -rf /',
    ' 1.2.3.4',
    '1.2.3.4\n',
    'a.b.c.d',
    '',
  ])('refuses "%s"', (value) => {
    expect(isValidIpv4(value)).toBe(false);
  });
});

describe('isValidIpv6', () => {
  it.each(['::1', '::', '2001:db8::1', 'fe80::a00:27ff:fe4e:66a1', '2001:0db8:0:0:0:ff00:42:8329'])(
    'accepts %s',
    (value) => {
      expect(isValidIpv6(value)).toBe(true);
    },
  );

  it.each([
    '12:34:56',
    '1:2:3:4:5:6:7',
    '1::2::3',
    ':::',
    'g::1',
    '2001:db8::1%eth0',
    '::ffff:1.2.3.4',
    '12345::1',
    '::1; id',
    '',
  ])('refuses "%s"', (value) => {
    expect(isValidIpv6(value)).toBe(false);
  });
});

describe('canonicalAddress', () => {
  it('lower-cases IPv6 and keeps IPv4', () => {
    expect(canonicalAddress('2001:DB8::A')).toBe('2001:db8::a');
    expect(canonicalAddress('10.0.0.1')).toBe('10.0.0.1');
  });

  it('returns null for text that is not an address', () => {
    expect(canonicalAddress('1.2.3.4; rm -rf /')).toBeNull();
    expect(canonicalAddress('localhost')).toBeNull();
  });
});

describe('isBlockableAddress', () => {
  it('refuses loopback, unspecified and broadcast addresses', () => {
    for (const address of ['127.0.0.1', '127.8.8.8', '0.0.0.0', '255.255.255.255', '::1', '::']) {
      expect(isBlockableAddress(address)).toBe(false);
    }
  });

  it('accepts ordinary addresses', () => {
    expect(isBlockableAddress('203.0.113.9')).toBe(true);
    expect(isBlockableAddress('2001:db8::1')).toBe(true);
  });
});

describe('extractAddress', () => {
  it('prefers a client address field', () => {
    expect(extractAddress('upstream 10.0.0.9 client', { client_ip: '203.0.113.5' })).toBe(
      '203.0.113.5',
    );
  });

  it('takes the first forwarded address of a list', () => {
    expect(extractAddress('x', { x_forwarded_for: '198.51.100.7, 10.0.0.1' })).toBe('198.51.100.7');
  });

  it('reads the first address in the text, IPv4 or IPv6', () => {
    expect(extractAddress('Failed password for root from 203.0.113.9 port 22', {})).toBe(
      '203.0.113.9',
    );
    expect(extractAddress('2001:db8::7 - - "GET / HTTP/1.1" 200', {})).toBe('2001:db8::7');
  });

  it('ignores clock times, versions and ports', () => {
    expect(extractAddress('10:20:30 started v1.2.3 on port 8080', {})).toBeNull();
    expect(extractAddress('addr 999.1.1.1 invalid', {})).toBeNull();
  });

  it('skips a field that holds something else', () => {
    expect(extractAddress('from 198.51.100.2', { ip: '1.2.3.4; rm -rf /' })).toBe('198.51.100.2');
  });
});
