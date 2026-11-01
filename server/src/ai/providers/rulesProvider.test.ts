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
});
