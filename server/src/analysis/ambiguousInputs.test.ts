import { describe, expect, it } from 'vitest';

import { RulesProvider } from '../ai/providers/rulesProvider';
import { analyzeLogWith } from '../services/analysisService';

/**
 * Logs that look like they have a cause but do not prove one. The engine must say "insufficient"
 * (or at most "unverified") instead of picking a culprit: a wrong confirmed cause is worse than
 * none. Each log is small on purpose, so the reason it proves nothing is easy to see.
 */
const AMBIGUOUS_LOGS: Record<string, string> = {
  'a change written after the failures it would explain': [
    '2026-11-03T10:00:01Z ERROR checkout request_id=a1 POST /checkout failed status=500',
    '2026-11-03T10:00:02Z ERROR checkout request_id=a2 POST /checkout failed status=500',
    '2026-11-03T10:05:00Z INFO deploy-bot config cache.ttl changed from 60 to 5 by=ci',
  ].join('\n'),

  'two changes before the failures and nothing tying the failures to either': [
    '2026-11-03T09:00:00Z INFO deploy-bot config pool.size changed from 20 to 5 by=ci',
    '2026-11-03T09:01:00Z INFO deploy-bot config feature.flag.newcart changed from false to true by=ci',
    '2026-11-03T09:10:00Z ERROR api request_id=r1 POST /orders failed status=500 error="timeout"',
    '2026-11-03T09:10:02Z ERROR api request_id=r2 POST /orders failed status=500 error="timeout"',
  ].join('\n'),

  'only effects, with no cause anywhere': [
    '2026-11-03T09:10:00Z ERROR api request_id=r1 upstream returned status=502',
    '2026-11-03T09:10:03Z ERROR api request_id=r2 upstream returned status=502',
    '2026-11-03T09:10:05Z ERROR api request_id=r3 upstream returned status=502',
  ].join('\n'),

  'a failure with a healthy dependency and an unrelated change': [
    '2026-11-03T09:00:00Z INFO deploy-bot config db.host changed from db1 to db2 by=ci',
    '2026-11-03T09:01:00Z INFO db health check ok host=db2 latency=3ms',
    '2026-11-03T09:02:00Z ERROR api request_id=r1 POST /orders failed status=500 error="validation: sku missing"',
    '2026-11-03T09:02:30Z INFO db health check ok host=db2 latency=2ms',
  ].join('\n'),

  'a failure that the log says was recovered': [
    '2026-11-03T09:00:00Z ERROR cache redis connect ECONNREFUSED 10.0.0.5:6379',
    '2026-11-03T09:00:05Z WARN cache retry 1 of 3',
    '2026-11-03T09:00:10Z INFO cache connection restored, errors=0',
    '2026-11-03T09:01:00Z INFO api GET /orders 200 12ms',
  ].join('\n'),

  'a log cut in the middle of a stack trace': [
    '2026-11-03T09:00:00Z ERROR api Unhandled exception: TypeError: Cannot read properties of undefined',
    '    at buildReport (/app/src/report.ts:42:18)',
    '    at async handler (/app/src/ser',
  ].join('\n'),
};

describe('root cause with ambiguous, incomplete or contradictory logs', () => {
  it.each(Object.entries(AMBIGUOUS_LOGS))('does not invent a cause: %s', async (_name, log) => {
    const { report } = await analyzeLogWith(new RulesProvider(), log);
    const incidents = report.incidents ?? [];

    expect(incidents.length).toBeGreaterThan(0);
    for (const incident of incidents) {
      expect(['insufficient', 'unverified']).toContain(incident.rootCause.status);
    }
  });

  it('never names the change written after the failures as their cause', async () => {
    const { report } = await analyzeLogWith(
      new RulesProvider(),
      AMBIGUOUS_LOGS['a change written after the failures it would explain'],
    );

    const summaries = (report.incidents ?? []).map((incident) => incident.rootCause.summary);
    expect(summaries.join(' ')).not.toContain('cache.ttl');
  });

  it('keeps every incident tied to evidence that exists in the log', async () => {
    const log =
      AMBIGUOUS_LOGS['two changes before the failures and nothing tying the failures to either'];
    const { report } = await analyzeLogWith(new RulesProvider(), log);

    for (const incident of report.incidents ?? []) {
      for (const evidence of incident.rootCause.evidence) {
        expect(log).toContain(evidence.quote);
      }
    }
  });
});
