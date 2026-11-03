import { describe, expect, it } from 'vitest';

import { MAX_OVERVIEW_ITEMS, MAX_OVERVIEW_LENGTH } from '../content/correlations';
import { correlateEvents, correlateIncident } from './correlation';
import { buildFindings } from './findings';

const DATABASE_REFUSED = '2026-11-03T09:14:07Z ERROR connect ECONNREFUSED 10.0.2.15:5432';
const POOL_EXHAUSTED = '2026-11-03T09:14:08Z WARN pool exhausted, 20/20 connections in use';
const TYPE_ERROR =
  "2026-11-03T09:14:09Z ERROR TypeError: Cannot read properties of undefined (reading 'rows')";
const SSH_FAILURE =
  '2026-11-03T09:14:12Z ERROR Failed password for root from 203.0.113.7 port 52211 ssh2';

function correlate(lines: string[]): string[] {
  const excerpt = lines.join('\n');
  return correlateEvents(excerpt, buildFindings(excerpt, 'low'));
}

function incident(lines: string[]) {
  const excerpt = lines.join('\n');
  return correlateIncident(excerpt, buildFindings(excerpt, 'low'));
}

function sshFailures(address: string, count: number): string[] {
  return Array.from(
    { length: count },
    (_, index) =>
      `Nov 3 10:00:0${index} web01 sshd[1]: Failed password for root from ${address} port 22 ssh2`,
  );
}

describe('correlateEvents root cause', () => {
  it('names a refused database connection as the cause of the code error that follows', () => {
    const overview = correlate([DATABASE_REFUSED, POOL_EXHAUSTED, TYPE_ERROR, SSH_FAILURE]);

    expect(overview[0]).toContain(
      'Probable root cause: connect ECONNREFUSED 10.0.2.15:5432 (Database)',
    );
    expect(overview[0]).toContain('Likely consequences: TypeError: Cannot read properties');
    expect(overview[0]).toContain('fix the database first');
  });

  it('does not link the unrelated SSH failure to the database', () => {
    const overview = correlate([DATABASE_REFUSED, POOL_EXHAUSTED, TYPE_ERROR, SSH_FAILURE]);

    expect(overview.join(' ')).not.toMatch(/Failed password|203\.0\.113\.7/);
  });

  it('reports the root cause of the incident for the report headline', () => {
    const result = incident([TYPE_ERROR, DATABASE_REFUSED].reverse());

    expect(result.rootCause?.category).toBe('Database');
    expect(result.compromisedLogin).toBe(false);
  });

  it('follows a chain through an intermediate event to the first cause', () => {
    const result = incident([
      '2026-11-03T10:00:00Z ERROR Failed to start postgresql.service',
      '2026-11-03T10:00:05Z ERROR connect ECONNREFUSED 10.0.2.15:5432',
      TYPE_ERROR.replace('09:14:09', '10:00:06'),
    ]);

    expect(result.rootCause?.category).toBe('Infrastructure');
    expect(result.overview[0]).toContain('Probable root cause: Failed to start postgresql.service');
    expect(result.overview[0]).toContain('connect ECONNREFUSED');
    expect(result.overview[0]).toContain('TypeError');
  });

  it.each([
    [
      'a full memory followed by a dropped connection',
      ['10:00:00 ERROR JavaScript heap out of memory', '10:00:03 ERROR read ECONNRESET'],
      'Infrastructure',
      'free the resource first',
    ],
    [
      'an expired certificate followed by a 502',
      [
        '10:00:00 ERROR Error: certificate has expired',
        '10:00:02 203.0.113.9 "GET /shop HTTP/1.1" 502 612',
      ],
      'Network',
      'renew or fix the certificate',
    ],
    [
      'an unresolved host name followed by a 500',
      [
        '10:00:00 ERROR getaddrinfo ENOTFOUND api.example.com',
        '10:00:01 203.0.113.9 "GET /shop HTTP/1.1" 500 612',
      ],
      'Network',
      'restore the connection first',
    ],
  ])('links %s', (_name, lines, expectedCategory, explanation) => {
    const result = incident(lines);

    expect(result.rootCause?.category).toBe(expectedCategory);
    expect(result.overview[0]).toContain(explanation);
  });
});

describe('correlateEvents order', () => {
  it('states the order with the time found in each evidence line', () => {
    const overview = correlate([DATABASE_REFUSED, POOL_EXHAUSTED, TYPE_ERROR]);
    const order = overview.find((sentence) => sentence.startsWith('Order of events:')) ?? '';

    expect(order).toContain('09:14:07 connect ECONNREFUSED 10.0.2.15:5432 (Database)');
    expect(order.indexOf('09:14:07')).toBeLessThan(order.indexOf('09:14:09'));
  });

  it('reads a log merged out of order by its timestamps', () => {
    const result = incident([TYPE_ERROR, DATABASE_REFUSED]);

    expect(result.rootCause?.category).toBe('Database');
    expect(result.overview[1]).toMatch(/^Order of events: 09:14:07 .* 09:14:09 /);
  });

  it('uses the order of the lines when they have no timestamp', () => {
    const overview = correlate([
      'ERROR connect ECONNREFUSED 10.0.2.15:5432',
      "ERROR TypeError: Cannot read properties of undefined (reading 'rows')",
    ]);

    expect(overview[1]).toMatch(
      /^Order of events in the log: connect ECONNREFUSED .*, then TypeError/,
    );
  });

  it('shows the clock of a syslog line and keeps the order of the lines', () => {
    const overview = correlate([
      'Nov  3 10:00:05 web01 app: ERROR connect ECONNREFUSED 10.0.2.15:5432',
      "Nov  3 10:00:07 web01 app: ERROR TypeError: Cannot read properties of undefined (reading 'rows')",
    ]);

    expect(overview[1]).toContain('Order of events: 10:00:05 ');
    expect(overview[1]).toContain('10:00:07 ');
  });

  it('adds the date when the events are on different days', () => {
    const overview = correlate([
      '2026-11-02T23:59:59Z ERROR connect ECONNREFUSED 10.0.2.15:5432',
      TYPE_ERROR.replace('2026-11-03T09:14:09Z', '2026-11-03T00:00:01Z'),
    ]);

    expect(overview[1]).toContain('2026-11-02 23:59:59 connect');
    expect(overview[1]).toContain('2026-11-03 00:00:01 TypeError');
  });
});

describe('correlateEvents negatives', () => {
  it('gives nothing for a 404 and an INFO line that have nothing to do with each other', () => {
    const overview = correlate([
      '203.0.113.9 - - [02/Nov/2026:10:14:05 +0000] "GET /wp-login.php HTTP/1.1" 404 153 "-" "curl/8"',
      '2026-11-02T10:14:06Z INFO request served in 12ms',
    ]);

    expect(overview).toEqual([]);
  });

  it('gives nothing for two real problems that no relation connects', () => {
    const overview = correlate([
      'ERROR write failed: no space left on device',
      'Nov 3 10:00:00 web01 sshd[1]: Failed password for root from 203.0.113.9',
    ]);

    expect(overview).toEqual([]);
  });

  it('does not call a code error that comes BEFORE the database error its symptom', () => {
    const lines = [TYPE_ERROR, '2026-11-03T09:14:10Z ERROR connect ECONNREFUSED 10.0.2.15:5432'];

    expect(correlate(lines)).toEqual([]);
    expect(incident(lines).rootCause).toBeNull();
  });

  it('does not call a code error without timestamps a symptom when the lines come first', () => {
    const lines = [
      "ERROR TypeError: Cannot read properties of undefined (reading 'rows')",
      'ERROR connect ECONNREFUSED 10.0.2.15:5432',
    ];

    expect(correlate(lines)).toEqual([]);
  });

  it('does not blame a database that only broke a unique constraint', () => {
    const overview = correlate([
      '10:00:00 ERROR duplicate key value violates unique constraint "users_email_key"',
      "10:00:01 ERROR TypeError: Cannot read properties of undefined (reading 'id')",
    ]);

    expect(overview).toEqual([]);
  });

  it('gives nothing without findings and nothing for a finding that is not in the excerpt', () => {
    const stray = { title: 'x', severity: 'low' as const, category: 'Database', evidence: 'nope' };

    expect(correlateEvents('INFO all good', [])).toEqual([]);
    expect(correlateEvents('INFO all good', [stray])).toEqual([]);
  });

  it('is deterministic', () => {
    const lines = [DATABASE_REFUSED, POOL_EXHAUSTED, TYPE_ERROR, SSH_FAILURE];

    expect(correlate(lines)).toEqual(correlate(lines));
  });
});

describe('correlateEvents shared entities', () => {
  const ATTACK =
    '203.0.113.9 - - [02/Nov/2026:10:14:02 +0000] "GET /?id=1 UNION SELECT 1 HTTP/1.1" 500 612';
  const NOT_FOUND =
    '203.0.113.9 - - [02/Nov/2026:10:14:03 +0000] "GET /wp-login.php HTTP/1.1" 404 153';
  const BRUTE_FORCE =
    'Nov 3 10:00:00 web01 sshd[1]: Failed password for root from 203.0.113.9 port 22 ssh2';

  it('treats one address behind an attack, a 404 and failed logins as one attacker', () => {
    const overview = correlate([ATTACK, NOT_FOUND, BRUTE_FORCE]);

    expect(overview).toHaveLength(1);
    expect(overview[0]).toContain('The same address 203.0.113.9 sent 3 suspicious requests');
    expect(overview[0]).toContain('block it once');
  });

  it('does not report an address that appears in a single finding', () => {
    const overview = correlate([ATTACK, 'ERROR write failed: no space left on device']);

    expect(overview).toEqual([]);
  });

  it('does not join two different addresses', () => {
    const overview = correlate([ATTACK, NOT_FOUND.replace('203.0.113.9', '203.0.113.10')]);

    expect(overview).toEqual([]);
  });

  it('points at a shared host without calling it an attacker when the events are not suspicious', () => {
    const overview = correlate([
      'Error: listen EADDRINUSE: address already in use 10.0.0.9:3000',
      'ERROR write failed: no space left on device (volume of 10.0.0.9:3000)',
    ]);

    expect(overview).toHaveLength(1);
    expect(overview[0]).toContain('The same address 10.0.0.9:3000 appears in 2 different events');
    expect(overview[0]).not.toContain('attacker');
  });

  it('matches an IPv6 address', () => {
    const overview = correlate([
      '2001:db8::7 - - [02/Nov/2026:10:14:02 +0000] "GET /?id=1 UNION SELECT 1 HTTP/1.1" 500 612',
      '2001:db8::7 - - [02/Nov/2026:10:14:03 +0000] "GET /wp-login.php HTTP/1.1" 404 153',
    ]);

    expect(overview[0]).toContain('The same address 2001:db8::7 sent 2 suspicious requests');
  });

  it('ignores loopback addresses, which say nothing about who sent a request', () => {
    const overview = correlate([
      'Error: listen EADDRINUSE: address already in use 127.0.0.1:3000',
      'ERROR write failed: no space left on device (volume of 127.0.0.1:3000)',
    ]);

    expect(overview).toEqual([]);
  });

  it('reports a user name shared by suspicious events', () => {
    const overview = correlate([
      'Nov 3 10:00:00 web01 sshd[1]: Failed password for deploy from 203.0.113.9 port 22 ssh2',
      '10.0.0.4 - - [02/Nov/2026:10:14:03 +0000] "GET /admin?user=deploy HTTP/1.1" 403 153',
    ]);

    expect(overview[0]).toContain('The user name deploy appears in 2 different events');
  });

  it('does not join an operating system user and a database user of the same name', () => {
    const overview = correlate([
      'Nov 3 10:00:00 web01 sshd[1]: Failed password for root from 203.0.113.9 port 22 ssh2',
      "ERROR 1045 (28000): Access denied for user 'root'@'localhost' (using password: YES)",
    ]);

    expect(overview.join(' ')).not.toContain('user name root');
  });
});

describe('correlateEvents brute force then accepted login', () => {
  const ACCEPTED =
    'Nov 3 10:05:00 web01 sshd[9]: Accepted password for root from 203.0.113.7 port 52300 ssh2';

  it('warns that the account may be compromised', () => {
    const lines = [...sshFailures('203.0.113.7', 3), ACCEPTED];
    const result = incident(lines);

    expect(result.compromisedLogin).toBe(true);
    expect(result.overview[0]).toContain('Possible successful brute force');
    expect(result.overview[0]).toContain('3 failed login lines from 203.0.113.7');
    expect(result.overview[0]).toContain('accepted login for root');
    expect(result.overview[0]).toContain('compromised');
  });

  it('also covers a public key login and an invalid user attempt', () => {
    const lines = [
      'Nov 3 10:00:00 web01 sshd[1]: Invalid user admin from 203.0.113.7 port 22',
      ...sshFailures('203.0.113.7', 2),
      'Nov 3 10:05:00 web01 sshd[9]: Accepted publickey for deploy from 203.0.113.7 port 52300 ssh2',
    ];

    expect(incident(lines).overview[0]).toContain('accepted login for deploy');
  });

  it('does not fire when the accepted login comes BEFORE the failures', () => {
    const result = incident([ACCEPTED, ...sshFailures('203.0.113.7', 4)]);

    expect(result.compromisedLogin).toBe(false);
    expect(result.overview).toEqual([]);
  });

  it('does not fire when the accepted login is from another address', () => {
    const result = incident([
      ...sshFailures('203.0.113.7', 4),
      ACCEPTED.replace('203.0.113.7', '198.51.100.2'),
    ]);

    expect(result.compromisedLogin).toBe(false);
  });

  it('does not fire for a user who mistyped the password once or twice', () => {
    const result = incident([...sshFailures('203.0.113.7', 2), ACCEPTED]);

    expect(result.compromisedLogin).toBe(false);
    expect(result.overview).toEqual([]);
  });

  it('does not fire for a login with no failure at all', () => {
    expect(incident([ACCEPTED]).compromisedLogin).toBe(false);
  });
});

describe('correlateEvents size', () => {
  it('keeps every sentence short and the list within the limit', () => {
    const longTail = ' x'.repeat(60);
    const lines = [
      `2026-11-03T09:00:00Z ERROR connect ECONNREFUSED 10.0.2.15:5432${longTail}`,
      `2026-11-03T09:00:01Z ERROR TypeError: Cannot read properties of undefined${longTail}`,
      `2026-11-03T09:00:02Z 203.0.113.9 "GET /a HTTP/1.1" 500 1${longTail}`,
      `2026-11-03T09:00:03Z 203.0.113.9 "GET /?id=1 UNION SELECT 1 HTTP/1.1" 404${longTail}`,
      `2026-11-03T09:00:04Z ERROR Failed password for root from 203.0.113.9${longTail}`,
    ];

    const overview = correlate(lines);

    expect(overview.length).toBeGreaterThan(0);
    expect(overview.length).toBeLessThanOrEqual(MAX_OVERVIEW_ITEMS);
    for (const sentence of overview) {
      expect(sentence.length).toBeLessThanOrEqual(MAX_OVERVIEW_LENGTH);
    }
  });
});
