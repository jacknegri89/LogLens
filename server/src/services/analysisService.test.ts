import { describe, expect, it, vi } from 'vitest';

import type { AIReport } from '../ai/schema';
import { analyzeLog } from './analysisService';

const modelReport: AIReport = {
  title: 'Disk full',
  severity: 'high',
  category: 'Infrastructure',
  keyLines: [],
  causes: [],
  debugSteps: [],
  bugReportMarkdown: '## Disk full',
};

vi.mock('../ai', () => ({
  getAIProvider: () => ({ name: 'fake', analyze: () => Promise.resolve(modelReport) }),
}));

describe('analyzeLog', () => {
  it('adds the detected format of the raw log to the report', async () => {
    const { report } = await analyzeLog('{"level":"error","msg":"disk full"}');

    expect(report.format).toBe('JSON lines');
  });

  it('rejects an empty log', async () => {
    await expect(analyzeLog('   ')).rejects.toThrow('Log text is empty.');
  });
});
