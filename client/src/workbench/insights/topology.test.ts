import { describe, expect, it } from 'vitest';

import type { AnalysisRecord, Finding, TimelineEntry } from '../../lib/types';
import { parseLines } from '../core/basicParse';
import { buildTopology, classifyText } from './topology';

const INCIDENT_LOG = [
  '2026-11-03T09:14:07Z ERROR connect ECONNREFUSED 10.0.2.15:5432',
  '2026-11-03T09:14:08Z WARN pool exhausted, 20/20 connections in use',
  "2026-11-03T09:14:09Z ERROR TypeError: Cannot read properties of undefined (reading 'rows')",
  '    at getOrders (/app/src/orders.js:42:18)',
].join('\n');

function entry(
  title: string,
  category: string,
  role: TimelineEntry['role'],
  causedBy?: number,
): TimelineEntry {
  return { title, category, severity: 'high', role, evidence: title, causedBy };
}

function recordWith(
  category: string,
  timeline: TimelineEntry[],
  findings: Finding[] = [],
): AnalysisRecord {
  return {
    id: 'sample',
    createdAt: '2026-11-03T09:20:00Z',
    source: 'paste',
    fileName: null,
    rawLog: '',
    title: timeline[0]?.title ?? 'sample',
    severity: 'high',
    category,
    report: { keyLines: [], causes: [], debugSteps: [], bugReportMarkdown: '', findings, timeline },
    helpful: null,
    shareToken: null,
  };
}

const INCIDENT_RECORD = recordWith('Database', [
  entry('connect ECONNREFUSED 10.0.2.15:5432', 'Database', 'root'),
  entry('pool exhausted, 20/20 connections in use', 'Database', 'independent'),
  entry("TypeError: Cannot read properties of undefined (reading 'rows')", 'Runtime', 'effect', 0),
]);

describe('classifyText', () => {
  it.each([
    ['upstream sent 502 Bad Gateway', 'loadBalancer'],
    ['nginx: worker process exited', 'loadBalancer'],
    ['prisma query failed', 'database'],
    ['connect ECONNREFUSED 10.0.2.15:5432', 'database'],
    ['redis connection lost', 'cache'],
    ['kafka consumer rebalancing', 'queue'],
    ['x509: certificate has expired', 'external'],
    ['express router crashed', 'api'],
  ])('reads "%s" as %s', (text, kind) => {
    expect(classifyText(text)).toBe(kind);
  });

  it('returns null for text with no known keyword', () => {
    expect(classifyText('Cannot read properties of undefined')).toBeNull();
    expect(classifyText('port 5024 opened')).toBeNull();
    expect(classifyText('')).toBeNull();
  });
});

describe('buildTopology with the incident sample', () => {
  const topology = buildTopology(parseLines(INCIDENT_LOG), INCIDENT_RECORD);

  it('finds the database and the API and labels the origin and what was affected', () => {
    const roles = Object.fromEntries(topology.nodes.map((node) => [node.kind, node.role]));

    expect(roles).toEqual({ api: 'affected', database: 'origin' });
    expect(topology.originIds).toEqual(['database']);
    expect(topology.affectedIds).toEqual(['api']);
    expect(topology.hasDiagnosis).toBe(true);
    expect(topology.sparse).toBe(false);
  });

  it('draws the propagation from the origin towards the affected node', () => {
    expect(topology.edges).toEqual([{ from: 'database', to: 'api', propagating: true }]);
  });
});

describe('buildTopology layers and services', () => {
  const lines = parseLines(
    [
      '2026-11-03T09:00:00Z ERROR [payments] charge failed',
      '2026-11-03T09:00:01Z ERROR [payments] charge failed again',
      '2026-11-03T09:00:02Z INFO nginx upstream timed out',
      '2026-11-03T09:00:03Z WARN redis connection lost',
    ].join('\n'),
  );

  it('orders the tiers and links each tier to the next one', () => {
    const topology = buildTopology(lines, null);

    expect(topology.nodes.map((node) => node.id)).toEqual([
      'loadBalancer',
      'service:payments',
      'cache',
    ]);
    expect(topology.edges.map((edge) => `${edge.from}>${edge.to}`)).toEqual([
      'loadBalancer>service:payments',
      'service:payments>cache',
    ]);
  });

  it('marks every node unknown, not healthy, when there is no analysis', () => {
    const topology = buildTopology(lines, null);

    expect(topology.hasDiagnosis).toBe(false);
    expect(topology.nodes.every((node) => node.role === 'unknown')).toBe(true);
    expect(topology.edges.some((edge) => edge.propagating)).toBe(false);
  });

  it('marks the other parts healthy once there is an origin, and follows the layers across a gap', () => {
    const record = recordWith('Database', [
      entry('prisma query failed', 'Database', 'root'),
      entry('payments charge failed', 'Infrastructure', 'effect', 0),
    ]);
    const topology = buildTopology(lines, record);
    const role = (id: string) => topology.nodes.find((node) => node.id === id)?.role;

    expect(role('database')).toBe('origin');
    expect(role('service:payments')).toBe('affected');
    expect(role('loadBalancer')).toBe('healthy');
    expect(role('cache')).toBe('healthy');
    expect(topology.edges.find((edge) => edge.propagating)).toEqual({
      from: 'database',
      to: 'service:payments',
      propagating: true,
    });
  });
});

describe('buildTopology with little information', () => {
  it('is sparse and empty for a log with nothing recognisable', () => {
    const topology = buildTopology(parseLines('hello\nworld'), null);

    expect(topology.nodes).toEqual([]);
    expect(topology.sparse).toBe(true);
  });

  it('takes the origin from the category when the report has no timeline', () => {
    const record = recordWith('Security Attack', []);
    const topology = buildTopology(parseLines('203.0.113.7 GET /products 500'), record);

    expect(topology.originIds).toEqual(['api']);
    expect(topology.sparse).toBe(true);
  });

  it('has no origin for a category that points nowhere', () => {
    const record = recordWith('Normal Traffic', []);

    expect(buildTopology(parseLines('GET /api/ok 200'), record).hasDiagnosis).toBe(false);
  });
});
