import { describe, expect, it } from 'vitest';

import { buildFindings, MAX_FINDINGS } from './findings';

const SSH_BRUTE_FORCE = 'Nov 3 10:00:00 web01 sshd[1]: Failed password for root from 203.0.113.9';
const ATTACK_SERVER_ERROR = '203.0.113.9 "GET /?id=1 UNION SELECT 1 HTTP/1.1" 500';
const DISK_FULL = 'ERROR write failed: no space left on device';
const CORS_ERROR = "Access to fetch blocked by CORS policy: no 'Access-Control-Allow-Origin'";

describe('buildFindings', () => {
  it('returns one finding per distinct rule, with the first matching line as evidence', () => {
    const excerpt = [SSH_BRUTE_FORCE, `${SSH_BRUTE_FORCE} again`, DISK_FULL].join('\n');

    const findings = buildFindings(excerpt, 'low');

    expect(findings).toHaveLength(2);
    expect(findings.find((finding) => finding.category === 'Security Attack')?.evidence).toBe(
      SSH_BRUTE_FORCE,
    );
  });

  it('ranks by severity, then by order in the log', () => {
    const excerpt = [CORS_ERROR, DISK_FULL, SSH_BRUTE_FORCE].join('\n');

    const severities = buildFindings(excerpt, 'low').map((finding) => finding.severity);

    expect(severities).toEqual(['high', 'high', 'low']);
    expect(buildFindings(excerpt, 'low')[0]?.category).toBe('Infrastructure');
  });

  it('raises an attack answered with a 5xx to critical', () => {
    const findings = buildFindings([ATTACK_SERVER_ERROR, DISK_FULL].join('\n'), 'low');

    expect(findings[0]).toMatchObject({ severity: 'critical', category: 'Security Attack' });
  });

  it('copies the technique and the OWASP category of the rule', () => {
    const findings = buildFindings([SSH_BRUTE_FORCE, ATTACK_SERVER_ERROR].join('\n'), 'low');

    expect(findings.map((finding) => finding.technique).sort()).toEqual([
      'T1110 Brute Force',
      'T1190 Exploit Public-Facing Application',
    ]);
    expect(findings.map((finding) => finding.owasp)).toContain('A03:2021 Injection');
  });

  it('leaves technique and OWASP out for a rule that has none', () => {
    const [first] = buildFindings([DISK_FULL, CORS_ERROR].join('\n'), 'low');

    expect(first).not.toHaveProperty('technique');
    expect(first).not.toHaveProperty('owasp');
  });

  it('returns nothing when the log holds a single distinct problem', () => {
    expect(buildFindings([DISK_FULL, `${DISK_FULL} (retry)`].join('\n'), 'low')).toEqual([]);
  });

  it('ignores lines that no rule explains', () => {
    const excerpt = ['all quiet here', 'nothing to see', DISK_FULL].join('\n');

    expect(buildFindings(excerpt, 'low')).toEqual([]);
  });

  it('keeps at most five findings', () => {
    const excerpt = [
      SSH_BRUTE_FORCE,
      DISK_FULL,
      CORS_ERROR,
      'ERROR ECONNREFUSED 10.0.0.1:80',
      'ERROR getaddrinfo ENOTFOUND api.example.com',
      'ERROR EADDRINUSE :::3000',
      'ERROR ENOENT: no such file or directory',
    ].join('\n');

    expect(buildFindings(excerpt, 'low')).toHaveLength(MAX_FINDINGS);
  });
});
