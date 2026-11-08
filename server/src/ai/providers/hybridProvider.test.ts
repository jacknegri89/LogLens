import { describe, expect, it } from 'vitest';

import type { AIProvider, AnalyzeInput } from '../AIProvider';
import type { AIReport } from '../schema';
import { chooseRoute, HybridProvider } from './hybridProvider';
import { RulesProvider } from './rulesProvider';

/** A stand-in for the model: records the calls and returns a fixed report, no network. */
class FakeModel implements AIProvider {
  readonly name = 'fake';
  calls = 0;

  analyze(): Promise<AIReport> {
    this.calls += 1;
    return Promise.resolve({
      title: 'from the model',
      severity: 'medium',
      category: 'Model',
      keyLines: [],
      causes: ['model cause'],
      debugSteps: ['model step'],
      bugReportMarkdown: '## from the model',
    });
  }
}

describe('HybridProvider', () => {
  it('answers a log that a known rule explains without calling the model', async () => {
    const model = new FakeModel();
    const provider = new HybridProvider(new RulesProvider(), model);

    const report = await provider.analyze({
      excerpt: 'ECONNREFUSED 172.18.0.2:5432',
      severityHint: 'low',
    });

    expect(model.calls).toBe(0);
    expect(report.category).toBe('Database');
  });

  it('sends a log that no rule covers to the model', async () => {
    const model = new FakeModel();
    const provider = new HybridProvider(new RulesProvider(), model);

    const report = await provider.analyze({
      excerpt: 'ERROR payments: charge rejected: card declined code=51',
      severityHint: 'high',
    } satisfies AnalyzeInput);

    expect(model.calls).toBe(1);
    expect(report.title).toBe('from the model');
  });
});

describe('HybridProvider routing and honesty', () => {
  const complexInput: AnalyzeInput = {
    excerpt: 'ECONNREFUSED 172.18.0.2:5432',
    severityHint: 'high',
    complexity: { level: 'complex', incidentCount: 1, reasons: ['multiple-services'] },
  };
  const limits = {
    maxContextChars: 24_000,
    maxContextEvents: 250,
    maxCallsPerAnalysis: 1,
    maxCostUsdPerAnalysis: 0.05,
    inputUsdPerMillionTokens: 0.15,
    outputUsdPerMillionTokens: 0.6,
    timeoutMs: 20_000,
  };

  it('sends a complex incident to the model even when a known rule matches', () => {
    expect(chooseRoute(complexInput).target).toBe('model');
  });

  it('does not call a model when the log has no incident', async () => {
    const model = new FakeModel();
    const provider = new HybridProvider(new RulesProvider(), model, limits);

    const traced = await provider.analyzeTraced({
      excerpt: 'INFO all good',
      severityHint: 'informational',
      complexity: { level: 'simple', incidentCount: 0, reasons: [] },
    });

    expect(model.calls).toBe(0);
    expect(traced.run).toEqual({ used: 'rules', aiUsed: false, fallbackReason: null });
  });

  it('reports that the model ran when it did', async () => {
    const model = new FakeModel();
    const provider = new HybridProvider(new RulesProvider(), model, limits);

    const traced = await provider.analyzeTraced(complexInput);

    expect(model.calls).toBe(1);
    expect(traced.run).toEqual({ used: 'fake', aiUsed: true, fallbackReason: null });
  });

  it('falls back to the rules and says so when the model fails', async () => {
    const failing: AIProvider = {
      name: 'fake',
      analyze: () => Promise.reject(new Error('The AI service did not answer in time.')),
    };
    const provider = new HybridProvider(new RulesProvider(), failing, limits);

    const traced = await provider.analyzeTraced(complexInput);

    expect(traced.run.used).toBe('rules');
    expect(traced.run.aiUsed).toBe(false);
    expect(traced.run.fallbackReason).toContain('did not answer in time');
  });

  it('does not call the model when the budget does not allow it', async () => {
    const model = new FakeModel();
    const provider = new HybridProvider(new RulesProvider(), model, {
      ...limits,
      maxCallsPerAnalysis: 0,
    });

    const traced = await provider.analyzeTraced(complexInput);

    expect(model.calls).toBe(0);
    expect(traced.run.aiUsed).toBe(false);
    expect(traced.run.fallbackReason).toContain('limit of model calls');
  });
});
