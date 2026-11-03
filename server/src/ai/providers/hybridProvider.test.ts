import { describe, expect, it } from 'vitest';

import type { AIProvider, AnalyzeInput } from '../AIProvider';
import type { AIReport } from '../schema';
import { HybridProvider } from './hybridProvider';
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
