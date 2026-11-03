import { describe, expect, it } from 'vitest';

import { RulesProvider } from './rulesProvider';

const provider = new RulesProvider();

describe('RulesProvider', () => {
  it('recognises a refused database connection', async () => {
    const report = await provider.analyze({
      excerpt: '2026-06-20T10:02:14Z ERROR connect ECONNREFUSED 172.18.0.2:5432',
      severityHint: 'low',
    });

    expect(report.category).toBe('Database');
    expect(report.severity).toBe('high');
    expect(report.keyLines).toHaveLength(1);
    expect(report.causes.length).toBeGreaterThan(0);
    expect(report.debugSteps.length).toBeGreaterThan(0);
  });

  it('recognises a port that is already in use', async () => {
    const report = await provider.analyze({
      excerpt: 'Error: listen EADDRINUSE: address already in use 0.0.0.0:3001',
      severityHint: 'medium',
    });

    expect(report.category).toBe('Network');
    expect(report.bugReportMarkdown).toContain('EADDRINUSE');
  });

  it('strips the timestamp and level from the title', async () => {
    const report = await provider.analyze({
      excerpt: '2026-06-20T10:05:42Z ERROR duplicate key value violates unique constraint "x"',
      severityHint: 'medium',
    });

    expect(report.title.startsWith('duplicate key')).toBe(true);
  });

  it('falls back to a generic report and keeps the severity hint', async () => {
    const report = await provider.analyze({
      excerpt: 'something odd happened in the kitchen',
      severityHint: 'low',
    });

    expect(report.category).toBe('Runtime');
    expect(report.severity).toBe('low');
  });

  it('is deterministic', async () => {
    const input = {
      excerpt: 'TypeError: Cannot read properties of undefined',
      severityHint: 'low' as const,
    };

    expect(await provider.analyze(input)).toEqual(await provider.analyze(input));
  });

  it('tells a missing Python module apart from a DNS error', async () => {
    const report = await provider.analyze({
      excerpt: "ModuleNotFoundError: No module named 'requests'",
      severityHint: 'low',
    });

    expect(report.category).toBe('Build');
  });

  it('recognises a name that cannot be resolved', async () => {
    const report = await provider.analyze({
      excerpt: 'Error: getaddrinfo ENOTFOUND api.example.com',
      severityHint: 'low',
    });

    expect(report.category).toBe('Network');
    expect(report.severity).toBe('high');
  });

  it('treats a refused connection to a web service as a network problem', async () => {
    const report = await provider.analyze({
      excerpt: 'connect() failed (111: Connection refused) while connecting to upstream',
      severityHint: 'low',
    });

    expect(report.category).toBe('Network');
  });

  it('marks an injection attack that got a 500 as a critical security attack', async () => {
    const report = await provider.analyze({
      excerpt:
        '203.0.113.7 - - [02/Nov/2026:10:14:02 +0000] "GET /products?id=1%27%20OR%201%3D1-- HTTP/1.1" 500 612 "-" "sqlmap/1.8#stable"',
      severityHint: 'low',
    });

    expect(report.category).toBe('Security Attack');
    expect(report.severity).toBe('critical');
    expect(report.keyLines[0]).toContain('sqlmap');
  });

  it('keeps an injection attempt that got no server error at high severity', async () => {
    const report = await provider.analyze({
      excerpt:
        '203.0.113.7 - - [02/Nov/2026:10:14:02 +0000] "GET /products?id=1 UNION SELECT password FROM users HTTP/1.1" 404 - "-" "sqlmap/1.8"',
      severityHint: 'low',
    });

    expect(report.category).toBe('Security Attack');
    expect(report.severity).toBe('high');
  });

  it('does not flag normal traffic as an attack', async () => {
    const report = await provider.analyze({
      excerpt:
        '203.0.113.9 - - [02/Nov/2026:10:14:05 +0000] "GET /products?id=3 HTTP/1.1" 200 980 "-" "Mozilla/5.0"',
      severityHint: 'low',
    });

    expect(report.category).not.toBe('Security Attack');
  });

  it('names the user and the cause of a failed PostgreSQL login', async () => {
    const report = await provider.analyze({
      excerpt: [
        'org.postgresql.util.PSQLException: FATAL: password authentication failed for user "db_user"',
        '\tat org.postgresql.core.v3.ConnectionFactoryImpl.doAuthentication(ConnectionFactoryImpl.java:700)',
      ].join('\n'),
      severityHint: 'high',
    });

    expect(report.category).toBe('Database Connection Failure');
    expect(report.severity).toBe('high');
    expect(report.causes[0]).toContain('db_user');
  });

  it('explains a Python IndexError with the last frame of the traceback', async () => {
    const report = await provider.analyze({
      excerpt: [
        'Traceback (most recent call last):',
        '  File "app.py", line 8, in main',
        '    return handle(items)',
        '  File "app.py", line 12, in get_first',
        '    return items[3]',
        'IndexError: list index out of range',
      ].join('\n'),
      severityHint: 'medium',
    });

    expect(report.category).toBe('Runtime');
    expect(report.severity).toBe('high');
    expect(report.causes[0]).toContain('app.py, line 12, in get_first');
  });

  it('names the frame where a Python KeyError happened', async () => {
    const report = await provider.analyze({
      excerpt: [
        'Traceback (most recent call last):',
        '  File "app.py", line 9, in load',
        "    return config['user_id']",
        "KeyError: 'user_id'",
      ].join('\n'),
      severityHint: 'low',
    });

    expect(report.category).toBe('Runtime');
    expect(report.severity).toBe('high');
    expect(report.causes[0]).toContain('app.py, line 9, in load');
  });

  it('treats a 502 from the proxy as an infrastructure failure, not a client error', async () => {
    const report = await provider.analyze({
      excerpt: '203.0.113.7 - - [02/Nov/2026:10:14:02 +0000] "GET /shop HTTP/1.1" 502 612',
      severityHint: 'low',
    });

    expect(report.category).toBe('Infrastructure');
    expect(report.severity).toBe('high');
  });

  it('recognises an unhandled Node.js promise rejection', async () => {
    const report = await provider.analyze({
      excerpt: 'UnhandledPromiseRejection: Error: boom',
      severityHint: 'low',
    });

    expect(report.category).toBe('Runtime');
    expect(report.severity).toBe('high');
  });

  it('names the user of a refused MySQL login', async () => {
    const report = await provider.analyze({
      excerpt:
        "ERROR 1045 (28000): Access denied for user 'root'@'localhost' (using password: YES)",
      severityHint: 'low',
    });

    expect(report.category).toBe('Database Connection Failure');
    expect(report.causes[0]).toContain('root');
  });

  it('flags repeated failed SSH logins as a brute-force attack', async () => {
    const report = await provider.analyze({
      excerpt: 'sshd[812]: Failed password for root from 203.0.113.5 port 22 ssh2',
      severityHint: 'low',
    });

    expect(report.category).toBe('Security Attack');
    expect(report.severity).toBe('high');
  });

  it('never answers that a log is unknown, and points at the failing line', async () => {
    const report = await provider.analyze({
      excerpt: 'INFO start\nERROR cache: write failed for key session:42',
      severityHint: 'high',
    });

    expect(report.causes[0]).toContain('ERROR cache: write failed for key session:42');
    expect(JSON.stringify(report)).not.toMatch(/known pattern/i);
  });

  it('recognises a full disk and a failing image pull', async () => {
    const disk = await provider.analyze({
      excerpt: 'ERROR write /data: no space left on device',
      severityHint: 'low',
    });
    const image = await provider.analyze({
      excerpt: 'Warning Failed kubelet Error: ImagePullBackOff',
      severityHint: 'low',
    });

    expect(disk.category).toBe('Infrastructure');
    expect(image.category).toBe('Infrastructure');
  });

  it('describes a 404 in the access log by its meaning, not as an unknown log', async () => {
    const report = await provider.analyze({
      excerpt:
        '203.0.113.9 - - [02/Nov/2026:10:14:05 +0000] "GET /wp-login.php HTTP/1.1" 404 153 "-" "curl/8"',
      severityHint: 'low',
    });

    expect(report.category).toBe('Client Error');
    expect(report.severity).toBe('low');
    expect(report.causes[0]).toContain('the path does not exist');
  });

  it('names the column of a PostgreSQL not-null violation in a Caused by chain', async () => {
    const report = await provider.analyze({
      excerpt: [
        '2026-11-02 10:20:01 ERROR OrderService - failed to save order 991',
        'Caused by: org.postgresql.util.PSQLException: ERROR: null value in column "sku" violates not-null constraint',
      ].join('\n'),
      severityHint: 'high',
    });

    expect(report.category).toBe('Database');
    expect(report.causes[0]).toContain('into sku');
  });

  it('keeps the real message as the title when the log starts with PHP Fatal error', async () => {
    const report = await provider.analyze({
      excerpt:
        'PHP Fatal error:  Uncaught TypeError: Argument 1 passed to foo() must be of type int, string given in /var/www/app.php:42',
      severityHint: 'high',
    });

    expect(report.title.startsWith('PHP Fatal error')).toBe(true);
    expect(report.category).toBe('Runtime');
    expect(report.causes[0]).toContain('Argument 1 passed to foo()');
  });

  it('strips a date and time prefix from the title', async () => {
    const report = await provider.analyze({
      excerpt: '2026-11-02 10:20:01 ERROR OrderService - failed to save order 991',
      severityHint: 'high',
    });

    expect(report.title).toBe('OrderService - failed to save order 991');
  });

  it('does not report a network timeout for a timeout_ms setting', async () => {
    const report = await provider.analyze({
      excerpt: 'INFO metrics errors_count=0 failed_jobs=0 timeout_ms=300',
      severityHint: 'low',
    });

    expect(report.category).not.toBe('Network');
  });

  it('quotes the exact failing line when no rule covers it', async () => {
    const report = await provider.analyze({
      excerpt: 'INFO start\nERROR payments: charge rejected: card declined code=51',
      severityHint: 'high',
    });

    expect(report.causes[0]).toContain('"ERROR payments: charge rejected: card declined code=51"');
  });

  it('says so when the excerpt holds no failure line', async () => {
    const report = await provider.analyze({
      excerpt: 'INFO metrics errors_count=0 failed_jobs=0 timeout_ms=300',
      severityHint: 'low',
    });

    expect(report.causes[0]).toContain('no line in it reports a failure');
  });

  it('titles an access log line by its method, path and status', async () => {
    const report = await provider.analyze({
      excerpt:
        '203.0.113.7 - - [02/Nov/2026:10:14:02 +0000] "GET /products?id=1 HTTP/1.1" 500 612 "-" "sqlmap/1.8"',
      severityHint: 'low',
    });

    expect(report.title).toBe('GET /products?id=1 returned 500');
  });

  it('keeps the plain title for a line that is not an access log', async () => {
    const report = await provider.analyze({
      excerpt: 'ECONNREFUSED 172.18.0.2:5432',
      severityHint: 'low',
    });

    expect(report.title).toBe('ECONNREFUSED 172.18.0.2:5432');
  });

  it.each([
    ['an expired TLS certificate', 'Error: certificate has expired', 'Network'],
    [
      'a Redis login failure',
      'ERR WRONGPASS invalid username-password pair',
      'Database Connection Failure',
    ],
    [
      'a Docker daemon that is not running',
      'Cannot connect to the Docker daemon at unix:///var/run/docker.sock',
      'Infrastructure',
    ],
    [
      'a Go panic',
      'panic: runtime error: invalid memory address or nil pointer dereference',
      'Runtime',
    ],
    ['a Rust panic', "thread 'main' panicked at src/main.rs:10:5", 'Runtime'],
    [
      'an unhandled .NET exception',
      'System.NullReferenceException: Object reference not set',
      'Runtime',
    ],
    ['a PHP uncaught exception', 'PHP Fatal error:  Uncaught Exception: boom', 'Runtime'],
    ['a Ruby NoMethodError', "NoMethodError: undefined method `name' for nil:NilClass", 'Runtime'],
    [
      'an nginx upstream error',
      '2026/11/03 10:00:00 [error] 1234#0: *5 connect() failed',
      'Infrastructure',
    ],
    [
      'a systemd service that failed to start',
      'Job for nginx.service failed because the control process exited',
      'Infrastructure',
    ],
    [
      'an evicted Kubernetes pod',
      'Pod was evicted: The node was low on resource: memory',
      'Infrastructure',
    ],
    [
      'a Java exception in a thread',
      'Exception in thread "main" java.lang.IllegalStateException: closed',
      'Runtime',
    ],
  ])('recognises %s', async (_name, excerpt, expectedCategory) => {
    const report = await provider.analyze({ excerpt, severityHint: 'medium' });

    expect(report.category).toBe(expectedCategory);
    expect(report.causes.length).toBeGreaterThan(0);
  });

  it('does not take an ordinary info line for a Java exception', async () => {
    const report = await provider.analyze({
      excerpt: '2026-11-03T10:00:00Z INFO request served in 12ms',
      severityHint: 'low',
    });

    expect(report.bugReportMarkdown).toContain('normal activity only');
  });
});
