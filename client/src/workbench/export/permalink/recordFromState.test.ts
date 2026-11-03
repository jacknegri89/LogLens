import { describe, expect, it } from 'vitest';

import { recordFromState } from './recordFromState';

const NOW = new Date('2026-11-03T12:00:00.000Z');

describe('recordFromState', () => {
  it('is null for a link without a report', () => {
    expect(recordFromState({ v: 1, language: 'en', log: 'x' }, NOW)).toBeNull();
  });

  it('turns the shared report into an analysis record', () => {
    const record = recordFromState(
      {
        v: 1,
        language: 'it',
        log: 'line',
        report: {
          title: 'Timeout',
          severity: 'high',
          category: 'database',
          report: { keyLines: ['a'], causes: [], debugSteps: [], bugReportMarkdown: '# x' },
        },
      },
      NOW,
    );
    expect(record).toMatchObject({
      title: 'Timeout',
      severity: 'high',
      rawLog: 'line',
      createdAt: '2026-11-03T12:00:00.000Z',
      shareToken: null,
    });
    expect(record?.report.keyLines).toEqual(['a']);
  });
});
