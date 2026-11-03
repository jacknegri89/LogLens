import { describe, expect, it } from 'vitest';

import type { Finding, Severity, TimelineEntry } from '../../lib/types';
import { parseLines } from '../core/basicParse';
import type { ParsedLine } from '../types';
import { computeRisk, countErrorBursts, hasSpreadingRoot, riskLevel, type RiskInput } from './risk';

const SEVERITIES: Severity[] = ['informational', 'low', 'medium', 'high', 'critical'];

const INCIDENT_LOG = [
  '2026-11-03T09:14:07Z ERROR connect ECONNREFUSED 10.0.2.15:5432',
  '2026-11-03T09:14:08Z WARN pool exhausted, 20/20 connections in use',
  "2026-11-03T09:14:09Z ERROR TypeError: Cannot read properties of undefined (reading 'rows')",
  '    at getOrders (/app/src/orders.js:42:18)',
  '2026-11-03T09:14:12Z ERROR Failed password for root from 203.0.113.7 port 52211 ssh2',
].join('\n');

function finding(category: string): Finding {
  return { title: category, severity: 'high', category, evidence: category };
}

function entry(role: TimelineEntry['role'], causedBy?: number): TimelineEntry {
  return { title: role, category: 'Database', severity: 'high', role, evidence: role, causedBy };
}

function input(overrides: Partial<RiskInput> = {}): RiskInput {
  return {
    severity: 'medium',
    category: 'Runtime',
    lines: parseLines('2026-11-03T09:00:00Z INFO ok\n2026-11-03T09:00:01Z ERROR boom'),
    findings: [],
    timeline: [],
    ...overrides,
  };
}

function timedFaults(count: number, gapMs: number): ParsedLine[] {
  const start = Date.parse('2026-11-03T09:00:00Z');
  const rows = Array.from({ length: count }, (_, index) => {
    const time = new Date(start + index * gapMs).toISOString();
    return `${time} ERROR failure ${index}`;
  });
  return parseLines(rows.join('\n'));
}

describe('computeRisk', () => {
  it('gives the documented value for the incident sample', () => {
    const risk = computeRisk({
      severity: 'high',
      category: 'Database',
      lines: parseLines(INCIDENT_LOG),
      findings: [
        finding('Database'),
        finding('Database'),
        finding('Runtime'),
        finding('Security Attack'),
      ],
      timeline: [entry('root'), entry('independent'), entry('effect', 0), entry('independent')],
    });

    // 65 severity + 8 (4 of 5 lines are faults) + 4 findings + 5 root cause + 5 security
    expect(risk.score).toBe(87);
    expect(risk.level).toBe('severe');
    expect(risk.factors.map((item) => item.points)).toEqual([65, 8, 4, 5, 5, 0]);
  });

  it('scores a single medium fault line without extras', () => {
    const risk = computeRisk(input({ lines: parseLines('ERROR boom') }));

    expect(risk.score).toBe(50);
    expect(risk.level).toBe('moderate');
  });

  it('is the severity weight alone for an empty log with no findings', () => {
    const risk = computeRisk(input({ severity: 'low', lines: [] }));

    expect(risk.score).toBe(20);
    expect(risk.factors.find((item) => item.id === 'faultRatio')?.points).toBe(0);
  });

  it('never goes above 100 and keeps the raw total visible', () => {
    const risk = computeRisk(
      input({
        severity: 'critical',
        category: 'Security Attack',
        lines: timedFaults(8, 1000),
        findings: Array.from({ length: 8 }, () => finding('Security Attack')),
        timeline: [entry('root'), entry('effect', 0)],
      }),
    );

    expect(risk.score).toBe(100);
    expect(risk.rawScore).toBe(115);
  });

  it('never lowers the score when the severity goes up', () => {
    const scores = SEVERITIES.map((severity) => computeRisk(input({ severity })).score);

    expect(scores).toEqual([...scores].sort((first, second) => first - second));
    expect(new Set(scores).size).toBe(SEVERITIES.length);
  });

  it('never lowers the score when more lines are faults', () => {
    const rows = Array.from(
      { length: 10 },
      (_, index) => `2026-11-03T09:00:0${index}Z INFO ok ${index}`,
    );
    let previous = -1;
    for (let faults = 0; faults <= rows.length; faults += 1) {
      const mixed = rows.map((row, index) => (index < faults ? row.replace('INFO', 'ERROR') : row));
      const score = computeRisk(input({ lines: parseLines(mixed.join('\n')) })).score;
      expect(score).toBeGreaterThanOrEqual(previous);
      previous = score;
    }
  });

  it('never lowers the score when findings are added', () => {
    let previous = -1;
    for (let count = 0; count <= 7; count += 1) {
      const findings = Array.from({ length: count }, () => finding('Runtime'));
      const score = computeRisk(input({ findings })).score;
      expect(score).toBeGreaterThanOrEqual(previous);
      previous = score;
    }
  });
});

describe('riskLevel', () => {
  it('names the level of each band edge', () => {
    expect([0, 29, 30, 54, 55, 79, 80, 100].map(riskLevel)).toEqual([
      'low',
      'low',
      'moderate',
      'moderate',
      'high',
      'high',
      'severe',
      'severe',
    ]);
  });
});

describe('countErrorBursts', () => {
  it('counts five faults inside ten seconds as one burst', () => {
    expect(countErrorBursts(timedFaults(5, 2000))).toBe(1);
  });

  it('does not count a slow trickle or too few faults', () => {
    expect(countErrorBursts(timedFaults(5, 3000))).toBe(0);
    expect(countErrorBursts(timedFaults(4, 100))).toBe(0);
    expect(countErrorBursts([])).toBe(0);
  });

  it('keeps one long storm as one burst and counts a second one apart', () => {
    const storm = timedFaults(30, 1000);
    const later = timedFaults(6, 1000).map((line) => ({
      ...line,
      timestamp: (line.timestamp ?? 0) + 3_600_000,
    }));

    expect(countErrorBursts(storm)).toBe(1);
    expect(countErrorBursts([...storm, ...later])).toBe(2);
  });

  it('ignores faults without a readable time', () => {
    expect(countErrorBursts(parseLines('ERROR a\nERROR b\nERROR c\nERROR d\nERROR e'))).toBe(0);
  });
});

describe('hasSpreadingRoot', () => {
  it('needs a root that something points back to', () => {
    expect(hasSpreadingRoot([entry('root'), entry('effect', 0)])).toBe(true);
    expect(hasSpreadingRoot([entry('root'), entry('independent')])).toBe(false);
    expect(hasSpreadingRoot([])).toBe(false);
  });
});
