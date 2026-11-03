import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AnalyzeInput } from '../ai/AIProvider';
import { RulesProvider } from '../ai/providers/rulesProvider';
import type { AIReport } from '../ai/schema';
import { analyzeLog } from './analysisService';

const INCIDENT = [
  '2026-11-03T09:14:07Z ERROR connect ECONNREFUSED 10.0.2.15:5432',
  "2026-11-03T09:14:09Z ERROR TypeError: Cannot read properties of undefined (reading 'rows')",
].join('\n');

const modelReport: AIReport = {
  title: 'Disk full',
  severity: 'high',
  category: 'Infrastructure',
  keyLines: [],
  causes: [],
  debugSteps: [],
  bugReportMarkdown: '## Disk full',
};

const { analyze } = vi.hoisted(() => ({
  analyze: vi.fn<(input: AnalyzeInput) => Promise<unknown>>(),
}));

vi.mock('../ai', () => ({
  getAIProvider: () => ({
    name: 'fake',
    analyze: (input: AnalyzeInput) => analyze(input),
  }),
}));

beforeEach(() => {
  analyze.mockReset();
  analyze.mockResolvedValue(modelReport);
});

describe('analyzeLog language', () => {
  it('hands the chosen language to the provider', async () => {
    await analyzeLog('ERROR disk full', 'it');

    expect(analyze).toHaveBeenCalledOnce();
    expect(analyze.mock.calls[0]?.[0]).toMatchObject({
      language: 'it',
      excerpt: 'ERROR disk full',
    });
  });

  it('asks the provider for English when no language is chosen', async () => {
    await analyzeLog('ERROR disk full');

    expect(analyze.mock.calls[0]?.[0]).toMatchObject({ language: 'en' });
  });

  it('names the detected format in the chosen language', async () => {
    const italian = await analyzeLog('just some words', 'it');
    const english = await analyzeLog('just some words', 'en');

    expect(italian.report.format).toBe('Testo semplice');
    expect(english.report.format).toBe('Plain text');
  });

  it('gives an Italian report from the rules engine end to end', async () => {
    analyze.mockImplementation((input) => new RulesProvider().analyze(input));

    const { report } = await analyzeLog(INCIDENT, 'it');

    expect(report.overview?.[0]).toMatch(/^Probabile causa radice:/);
    expect(report.bugReportMarkdown).toContain('### Cause probabili');
  });
});
