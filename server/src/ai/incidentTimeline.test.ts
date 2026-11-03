import { describe, expect, it } from 'vitest';

import type { Finding } from '../types/report';
import { buildTimeline } from './eventTimeline';
import { buildTimelineEntries, MAX_TIMELINE_ENTRIES } from './incidentTimeline';
import { RulesProvider } from './providers/rulesProvider';
import { aiReportSchema } from './schema';

const INCIDENT = [
  '2026-11-03T09:14:07Z ERROR connect ECONNREFUSED 10.0.2.15:5432',
  '2026-11-03T09:14:08Z WARN pool exhausted, 20/20 connections in use',
  "2026-11-03T09:14:09Z ERROR TypeError: Cannot read properties of undefined (reading 'rows')",
  '    at getOrders (/app/src/orders.js:42:18)',
  '2026-11-03T09:14:12Z ERROR Failed password for root from 203.0.113.7 port 52211 ssh2',
].join('\n');

const provider = new RulesProvider();

function analyze(excerpt: string) {
  return provider.analyze({ excerpt, severityHint: 'low' });
}

function makeFinding(index: number): Finding {
  return {
    title: `Problem number ${index}`,
    severity: 'low',
    category: 'Runtime',
    evidence: `line ${index}`,
  };
}

describe('timeline of the rules provider', () => {
  it('marks the refused connection as root, the code error as its effect, the rest as independent', async () => {
    const { timeline = [] } = await analyze(INCIDENT);

    expect(timeline.map((entry) => entry.role)).toEqual([
      'root',
      'independent',
      'effect',
      'independent',
    ]);
    expect(timeline[0]).toMatchObject({ time: '09:14:07', category: 'Database' });
    expect(timeline[2]).toMatchObject({ time: '09:14:09', category: 'Runtime', causedBy: 0 });
    expect(timeline[3]).toMatchObject({ time: '09:14:12', category: 'Security Attack' });
    expect(timeline[3]).not.toHaveProperty('causedBy');
    expect(timeline[0]).not.toHaveProperty('causedBy');
  });

  it('points causedBy at the root even when an independent event comes first', async () => {
    const reordered = [
      'Failed password for root from 203.0.113.7 port 52211 ssh2',
      'connect ECONNREFUSED 10.0.2.15:5432',
      "TypeError: Cannot read properties of undefined (reading 'rows')",
    ].join('\n');

    const { timeline = [] } = await analyze(reordered);

    expect(timeline.map((entry) => entry.role)).toEqual(['independent', 'root', 'effect']);
    expect(timeline[2]?.causedBy).toBe(1);
  });

  it('stays valid for the report schema', async () => {
    const report = await analyze(INCIDENT);

    expect(aiReportSchema.safeParse(report).success).toBe(true);
  });

  it('has no timeline for a log with a single event', async () => {
    const report = await analyze('2026-11-03T09:14:07Z ERROR connect ECONNREFUSED 10.0.2.15:5432');

    expect(report).not.toHaveProperty('timeline');
  });

  it('has no timeline for a log without a known problem', async () => {
    const report = await analyze('2026-11-03T09:14:07Z INFO server started');

    expect(report).not.toHaveProperty('timeline');
  });

  it('omits the time of a line that has none', async () => {
    const { timeline = [] } = await analyze(
      ['connect ECONNREFUSED 10.0.2.15:5432', 'Failed password for root from 203.0.113.7'].join(
        '\n',
      ),
    );

    expect(timeline).toHaveLength(2);
    expect(timeline[0]).not.toHaveProperty('time');
  });
});

describe('buildTimelineEntries', () => {
  it('gives an empty list for fewer than two events', () => {
    const events = buildTimeline(['line 1'], [makeFinding(1)]);

    expect(buildTimelineEntries(events, [])).toEqual([]);
  });

  it('shortens the title and the evidence', () => {
    const long = { ...makeFinding(1), title: 'word '.repeat(40), evidence: 'x'.repeat(500) };
    const events = buildTimeline([], [long, makeFinding(2)]);

    const [first] = buildTimelineEntries(events, []);

    expect(first?.title.length).toBeLessThanOrEqual(70);
    expect(first?.evidence).toHaveLength(300);
  });

  it('keeps roots and effects when it has to cut, and renumbers causedBy', () => {
    const findings = Array.from({ length: 12 }, (_, index) => makeFinding(index));
    const events = buildTimeline([], findings);
    const root = events[10];
    const effect = events[11];
    if (!root || !effect) throw new Error('missing events');

    const entries = buildTimelineEntries(events, [{ root, consequences: [effect] }]);

    expect(entries).toHaveLength(MAX_TIMELINE_ENTRIES);
    expect(entries.filter((entry) => entry.role !== 'independent')).toHaveLength(2);
    const effectEntry = entries.find((entry) => entry.role === 'effect');
    expect(entries[effectEntry?.causedBy ?? -1]?.role).toBe('root');
  });
});
