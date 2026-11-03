import { describe, expect, it } from 'vitest';

import { parseLog } from './logParser';
import { separateNoise } from './noiseFilter';

function lines(...contents: string[]) {
  return contents.map((content, index) => ({ content, lineNumber: index + 1 }));
}

describe('separateNoise', () => {
  it('removes health checks, load balancer probes and static assets answered normally', () => {
    const { kept, noise } = separateNoise(
      lines(
        '10.0.0.1 - - "GET /health HTTP/1.1" 200 2 "-" "curl/8.0"',
        '10.0.0.2 - - "GET /status-page HTTP/1.1" 200 512 "-" "ELB-HealthChecker/2.0"',
        '10.0.0.3 - - "GET /static/app.3f2a.js HTTP/1.1" 200 90210 "-" "Mozilla/5.0"',
        '10.0.0.3 - - "GET /logo.png HTTP/1.1" 304 0 "-" "Mozilla/5.0"',
        '10.0.0.9 - - "POST /api/orders HTTP/1.1" 502 120 "-" "Mozilla/5.0"',
      ),
    );

    expect(kept.map((line) => line.lineNumber)).toEqual([5]);
    expect(noise.removed).toBe(4);
    expect(noise.byKind).toEqual({ 'health-check': 1, probe: 1, 'static-asset': 2 });
  });

  it('keeps a health check that fails: a failing probe is news', () => {
    const { kept, noise } = separateNoise(
      lines('10.0.0.1 - - "GET /healthz HTTP/1.1" 503 12 "-" "kube-probe/1.29"'),
    );

    expect(kept).toHaveLength(1);
    expect(noise.removed).toBe(0);
  });

  it('keeps a routine line that shares a trace id with a failing line', () => {
    const { kept, noise } = separateNoise(
      lines(
        'GET /health HTTP/1.1 200 request_id=req-4f9a21c7',
        'ERROR upstream refused the connection request_id=req-4f9a21c7',
        'GET /ping HTTP/1.1 200 request_id=req-zzzzzzzz',
      ),
    );

    expect(kept.map((line) => line.lineNumber)).toEqual([1, 2]);
    expect(noise.removed).toBe(1);
  });

  it('keeps a static asset that errored and ordinary application lines', () => {
    const { kept } = separateNoise(
      lines(
        '10.0.0.3 - - "GET /static/app.js HTTP/1.1" 500 12 "-" "Mozilla/5.0"',
        'INFO user alice signed in',
        '10.0.0.3 - - "GET /api/health-report HTTP/1.1" 200 5 "-" "Mozilla/5.0"',
      ),
    );

    expect(kept).toHaveLength(3);
  });
});

describe('parseLog with routine noise', () => {
  const NOISY_LOG = [
    ...Array.from(
      { length: 30 },
      () => '10.0.0.1 - - "GET /health HTTP/1.1" 200 2 "-" "ELB-HealthChecker/2.0"',
    ),
    '2026-11-03T09:14:07Z WARN pool at 19/20 connections',
    '2026-11-03T09:14:08Z ERROR connect ECONNREFUSED 10.0.2.15:5432',
  ].join('\n');

  it('builds the excerpt without the noise and reports how much was removed', () => {
    const result = parseLog(NOISY_LOG);

    expect(result.excerpt).not.toContain('/health');
    expect(result.excerpt).toContain('ECONNREFUSED');
    expect(result.noise).toEqual({ removed: 30, byKind: { 'health-check': 30 } });
    expect(result.totalLines).toBe(32);
  });

  it('does not use routine lines as the fallback tail when something else exists', () => {
    const result = parseLog(
      [
        '10.0.0.1 - - "GET /health HTTP/1.1" 200 2',
        'INFO cache warmed up',
        'INFO listening on 8080',
      ].join('\n'),
    );

    expect(result.excerpt).toBe('INFO cache warmed up\nINFO listening on 8080');
  });

  it('analyses a log made only of routine lines as it is, instead of sending nothing', () => {
    const result = parseLog('10.0.0.1 - - "GET /health HTTP/1.1" 200 2');

    expect(result.excerpt).toContain('GET /health');
    expect(result.noise.removed).toBe(0);
  });
});

describe('parseLog relevance categories', () => {
  it('keeps firewall and WAF events even without an error word', () => {
    const result = parseLog(
      '2026-11-03T09:14:07Z cloudflare action=block rule_id=100015 ip=203.0.113.7\nINFO ok',
    );

    expect(result.relevantLines.map((line) => line.category)).toEqual(['waf']);
    expect(result.severityHint).toBe('medium');
  });

  it('keeps changes of authentication state', () => {
    const result = parseLog(
      'INFO session expired for user 42\nINFO MFA challenge passed\nINFO cache warmed up',
    );

    expect(result.relevantLines.map((line) => line.category)).toEqual(['auth', 'auth']);
  });
});
