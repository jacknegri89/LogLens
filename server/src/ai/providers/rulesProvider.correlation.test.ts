import { describe, expect, it } from 'vitest';

import { aiReportSchema } from '../schema';
import { RulesProvider } from './rulesProvider';

const provider = new RulesProvider();

const INCIDENT = [
  '2026-11-03T09:14:07Z ERROR connect ECONNREFUSED 10.0.2.15:5432',
  '2026-11-03T09:14:08Z WARN pool exhausted, 20/20 connections in use',
  "2026-11-03T09:14:09Z ERROR TypeError: Cannot read properties of undefined (reading 'rows')",
  '    at getOrders (/app/src/orders.js:42:18)',
  '2026-11-03T09:14:12Z ERROR Failed password for root from 203.0.113.7 port 52211 ssh2',
].join('\n');

function sshFailures(count: number): string[] {
  return Array.from(
    { length: count },
    (_, index) =>
      `Nov 3 10:00:0${index} web01 sshd[1]: Failed password for root from 203.0.113.7 port 22 ssh2`,
  );
}

const ACCEPTED_LOGIN =
  'Nov 3 10:05:00 web01 sshd[9]: Accepted password for root from 203.0.113.7 port 52300 ssh2';

describe('RulesProvider big picture', () => {
  it('explains a refused database, the order and the code error that follows it', async () => {
    const report = await provider.analyze({ excerpt: INCIDENT, severityHint: 'low' });
    const overview = report.overview ?? [];
    const text = overview.join('\n');

    expect(overview[0]).toMatch(/root cause: connect ECONNREFUSED 10\.0\.2\.15:5432 \(Database\)/);
    expect(overview[0]).toContain('Likely consequences: TypeError');
    expect(overview[0]?.endsWith('.')).toBe(true);
    expect(text).toContain('Order of events: 09:14:07');
    expect(text.indexOf('ECONNREFUSED')).toBeLessThan(text.indexOf('Cannot read properties'));
    expect(text).not.toMatch(/Failed password|203\.0\.113\.7/);
  });

  it('puts the chain first in the causes and keeps the rule causes after it', async () => {
    const report = await provider.analyze({ excerpt: INCIDENT, severityHint: 'low' });

    expect(report.causes[0]).toBe(report.overview?.[0]);
    expect(report.causes.length).toBeGreaterThan(1);
    expect(report.category).toBe('Database');
    expect(report.title).toBe('connect ECONNREFUSED 10.0.2.15:5432');
  });

  it('keeps every finding, ranked as before, and still reports the SSH attack on its own', async () => {
    const report = await provider.analyze({ excerpt: INCIDENT, severityHint: 'low' });

    // The exhausted pool is its own Database finding, next to the refused connection.
    expect(report.findings?.map((finding) => finding.category)).toEqual([
      'Database',
      'Database',
      'Runtime',
      'Security Attack',
    ]);
  });

  it('adds a Big picture section between the title block and the log lines', async () => {
    const report = await provider.analyze({ excerpt: INCIDENT, severityHint: 'low' });
    const markdown = report.bugReportMarkdown;

    expect(markdown.indexOf('**Category:**')).toBeLessThan(markdown.indexOf('### Big picture'));
    expect(markdown.indexOf('### Big picture')).toBeLessThan(markdown.indexOf('### Log lines'));
    expect(markdown).toContain(`- ${report.overview?.[0]}`);
  });

  it('describes the root cause in the headline even when a later rule of the table matches first', async () => {
    const report = await provider.analyze({
      excerpt: [
        '2026-11-03T10:00:00Z ERROR Failed to start postgresql.service',
        '2026-11-03T10:00:05Z ERROR connect ECONNREFUSED 10.0.2.15:5432',
      ].join('\n'),
      severityHint: 'low',
    });

    expect(report.category).toBe('Infrastructure');
    expect(report.title).toBe('Failed to start postgresql.service');
    expect(report.keyLines[0]).toContain('Failed to start postgresql.service');
  });

  it('keeps today headline and adds no section when nothing connects the findings', async () => {
    const report = await provider.analyze({
      excerpt: [
        'ERROR write failed: no space left on device',
        'Nov 3 10:00:00 web01 sshd[1]: Failed password for root from 203.0.113.9',
      ].join('\n'),
      severityHint: 'low',
    });

    expect(report.category).toBe('Infrastructure');
    expect(report.overview).toBeUndefined();
    expect(report.bugReportMarkdown).not.toContain('Big picture');
    expect(report.causes[0]).toContain('disk or the partition');
  });

  it('does not call a code error that comes first a symptom of the database error after it', async () => {
    const report = await provider.analyze({
      excerpt: [
        "2026-11-03T09:14:09Z ERROR TypeError: Cannot read properties of undefined (reading 'rows')",
        '2026-11-03T09:14:10Z ERROR connect ECONNREFUSED 10.0.2.15:5432',
      ].join('\n'),
      severityHint: 'low',
    });

    expect(report.overview).toBeUndefined();
  });

  it('produces a report that fits the schema and is deterministic', async () => {
    const first = await provider.analyze({ excerpt: INCIDENT, severityHint: 'low' });
    const second = await provider.analyze({ excerpt: INCIDENT, severityHint: 'low' });

    expect(aiReportSchema.safeParse(first).success).toBe(true);
    expect(first).toEqual(second);
  });
});

describe('RulesProvider brute force then accepted login', () => {
  it('makes the report critical and says so first in the causes', async () => {
    const report = await provider.analyze({
      excerpt: [...sshFailures(3), ACCEPTED_LOGIN].join('\n'),
      severityHint: 'low',
    });

    expect(report.severity).toBe('critical');
    expect(report.category).toBe('Security Attack');
    expect(report.causes[0]).toContain('Possible successful brute force');
    expect(report.bugReportMarkdown).toContain('**Severity:** critical');
  });

  it('keeps the severity high when the same failures end with no accepted login', async () => {
    const report = await provider.analyze({
      excerpt: sshFailures(3).join('\n'),
      severityHint: 'low',
    });

    expect(report.severity).toBe('high');
    expect(report.overview).toBeUndefined();
  });

  it('keeps the severity high when the accepted login comes before the failures', async () => {
    const report = await provider.analyze({
      excerpt: [ACCEPTED_LOGIN, ...sshFailures(3)].join('\n'),
      severityHint: 'low',
    });

    expect(report.severity).toBe('high');
  });
});
