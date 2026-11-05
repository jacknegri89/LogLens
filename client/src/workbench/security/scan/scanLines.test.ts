import { describe, expect, it } from 'vitest';

import { parseLines } from '../../core/basicParse';
import { findLinePosition } from '../../inspector/linePosition';
import { scanLines } from './scanLines';

function access(address: string, target: string, agent = 'Mozilla/5.0', status = 200): string {
  return `${address} - - [03/Nov/2026:10:00:00 +0000] "GET ${target} HTTP/1.1" ${status} 512 "-" "${agent}"`;
}

function scan(rawLines: string[]) {
  return scanLines(parseLines(rawLines.join('\n')));
}

describe('scanLines', () => {
  it('keeps sample indexes aligned with original lines after blank lines', () => {
    const input = '\nINFO normal\n\nGET /.env HTTP/1.1 200';
    const parsed = parseLines(input);
    const result = scanLines(parsed);
    const index = result.groups[0].samples[0];
    const sample = parsed[findLinePosition(parsed, index)];
    expect(index).toBe(3);
    expect(sample.raw).toContain('/.env');
  });
  it('finds nothing in an ordinary log', () => {
    const result = scan([
      access('198.51.100.1', '/'),
      access('198.51.100.2', '/search?q=select+shoes'),
      '2026-11-03T10:00:00Z INFO [api] listening on 8080',
    ]);
    expect(result.groups).toEqual([]);
    expect(result.highSignals).toBe(0);
    expect(result.offenders).toEqual([]);
    expect(result.scannedLines).toBe(3);
  });

  it('groups by attack type with OWASP and MITRE ids, high severity first', () => {
    const result = scan([
      access('203.0.113.9', '/.env'),
      access('203.0.113.9', '/x?id=1+union+select+1'),
      access('203.0.113.7', '/x?id=1+union+select+2'),
    ]);
    expect(result.groups.map((group) => group.type)).toEqual(['sqlInjection', 'sensitivePath']);
    const [sql, paths] = result.groups;
    expect(sql).toMatchObject({ severity: 'high', owasp: 'A03', mitre: 'T1190', count: 2 });
    expect(paths).toMatchObject({ severity: 'medium', owasp: 'A05', count: 1 });
  });

  it('ranks the offending addresses and samples the lines', () => {
    const result = scan([
      access('203.0.113.9', '/a?id=1+union+select+1'),
      access('203.0.113.7', '/a?id=1+union+select+1'),
      access('203.0.113.9', '/b?id=1+union+select+1'),
    ]);
    expect(result.groups[0].topAddresses).toEqual([
      { address: '203.0.113.9', count: 2 },
      { address: '203.0.113.7', count: 1 },
    ]);
    expect(result.groups[0].samples).toEqual([0, 1, 2]);
  });

  it('counts high signals and the addresses behind them', () => {
    const result = scan([
      access('203.0.113.9', '/a?id=1+union+select+1'),
      access('203.0.113.9', '/b?q=<script>'),
      access('203.0.113.7', '/.env'),
    ]);
    expect(result.highSignals).toBe(2);
    expect(result.highAddresses).toEqual(['203.0.113.9']);
  });

  it('counts a line with two signals of different kinds once for each', () => {
    const result = scan([access('203.0.113.9', '/a?q=<script>&id=1+union+select+1')]);
    expect(result.groups.map((group) => group.count)).toEqual([1, 1]);
    expect(result.highSignals).toBe(2);
  });

  it('includes brute force and keeps loopback out of the offenders', () => {
    const failures = Array.from({ length: 5 }, () => 'Failed password for root from 127.0.0.1');
    const other = Array.from({ length: 5 }, () => 'Failed password for root from 203.0.113.9');
    const result = scan([...failures, ...other]);
    expect(result.groups.map((group) => group.type)).toEqual(['bruteForce']);
    expect(result.offenders.map((entry) => entry.address)).toEqual(['203.0.113.9']);
  });

  it('limits the samples to five lines', () => {
    const result = scan(Array.from({ length: 9 }, () => access('203.0.113.9', '/.env')));
    expect(result.groups[0].count).toBe(9);
    expect(result.groups[0].samples).toHaveLength(5);
  });
});
