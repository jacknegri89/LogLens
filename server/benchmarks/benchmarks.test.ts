import { describe, expect, it } from 'vitest';

import { buildSystemPrompt, buildUserPrompt } from '../src/ai/prompt';
import { buildStructuredContext } from '../src/ai/structuredContext';
import { analyzeStructure } from '../src/analysis/analyzeStructure';
import { BENCHMARK_LIMITS, runBenchmarks, type BenchmarkReport } from './evaluate';
import { SCENARIOS } from './scenarios';
import { ttlRegression } from './fixtures/ttlRegression';

/**
 * The benchmark of the analysis engine. It needs no paid API: the deterministic engine is scored
 * against realistic logs with known answers. Run `npm run benchmark` for the table.
 */

const PERFECT = 1;
const SLOW_SCENARIO_MS = 3000;

let cached: Promise<BenchmarkReport> | undefined;
function benchmark(): Promise<BenchmarkReport> {
  cached ??= runBenchmarks(SCENARIOS);
  return cached;
}

describe('benchmark scenarios', () => {
  it('covers the fourteen listed cases and the TTL regression', () => {
    expect(SCENARIOS).toHaveLength(15);
    expect(new Set(SCENARIOS.map((scenario) => scenario.id)).size).toBe(15);
  });

  it.each(SCENARIOS.map((scenario) => [scenario.id, scenario] as const))(
    '%s matches what a correct analysis finds',
    async (id) => {
      const report = await benchmark();
      const result = report.scenarios.find((entry) => entry.id === id);
      expect(result?.failures).toEqual([]);
    },
  );

  it('reaches the quality targets on every metric', async () => {
    const { aggregate } = await benchmark();
    expect(aggregate.parsingAccuracy).toBe(PERFECT);
    expect(aggregate.eventCoverage).toBe(PERFECT);
    expect(aggregate.incidentRecall).toBe(PERFECT);
    expect(aggregate.incidentPrecision).toBe(PERFECT);
    expect(aggregate.rootCauseAccuracy).toBe(PERFECT);
    expect(aggregate.falsePositiveRate).toBe(0);
    expect(aggregate.evidenceValidity).toBe(PERFECT);
  });

  it('does better than the analysis it replaces on the same scenarios', async () => {
    const { aggregate, legacyAggregate } = await benchmark();
    expect(aggregate.incidentRecall ?? 0).toBeGreaterThan(legacyAggregate.incidentRecall ?? 0);
    expect(aggregate.incidentPrecision ?? 0).toBeGreaterThan(
      legacyAggregate.incidentPrecision ?? 0,
    );
    expect(aggregate.rootCauseAccuracy ?? 0).toBeGreaterThan(
      legacyAggregate.rootCauseAccuracy ?? 0,
    );
    expect(aggregate.falsePositiveRate ?? 1).toBeLessThan(legacyAggregate.falsePositiveRate ?? 0);
  });

  it('stays fast, and makes no model call', async () => {
    const { scenarios } = await benchmark();
    for (const result of scenarios) {
      expect(result.processingMs).toBeLessThan(SLOW_SCENARIO_MS);
      expect(result.aiCalls).toBe(0);
      expect(result.estimatedAiCostUsd).toBeLessThan(BENCHMARK_LIMITS.maxCostUsdPerAnalysis);
    }
  });
});

describe('the mandatory TTL regression', () => {
  const analysis = analyzeStructure(ttlRegression.log);
  const regression = analysis.incidents.find((incident) => incident.rootCause.kind === 'change');

  it('identifies the configuration change as the confirmed root cause', () => {
    const source = analysis.log.events.find(
      (event) => event.eventId === regression?.rootCause.sourceEventId,
    );
    expect(source?.message).toContain('reservation.ttlMs changed from 900000 to 900');
    expect(regression?.rootCause.status).toBe('confirmed');
  });

  it('links the five orders that were paid and not fulfilled', () => {
    expect(regression?.impact.paidThenFailed.sort()).toEqual([
      'O-1101',
      'O-1102',
      'O-1103',
      'O-1105',
      'O-1106',
    ]);
  });

  it('separates the independent storage timeouts', () => {
    const storage = analysis.incidents.find((incident) => incident.services.includes('storage'));
    expect(storage).toBeDefined();
    expect(storage?.id).not.toBe(regression?.id);
    expect(storage?.rootCause.status).toBe('insufficient');
    expect(storage?.anomalyEventIds).toHaveLength(6);
  });

  it('does not hand the model the answer', () => {
    const context = buildStructuredContext(analysis, BENCHMARK_LIMITS);
    const prompt = [
      buildSystemPrompt('en', true),
      buildUserPrompt({
        excerpt: '',
        severityHint: 'low',
        structured: {
          contextJson: '',
          incidentIds: context.incidentIds,
          omittedEvents: context.omittedEvents,
        },
      }),
    ].join('\n');
    for (const hint of ['ttl', 'reservation', 'expired', '900', 'config reload']) {
      expect(prompt.toLowerCase()).not.toContain(hint);
    }
  });
});
