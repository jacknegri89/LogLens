import { describe, expect, it } from 'vitest';

import type { AIReport } from '../ai/schema';
import { addCorrelation } from './addCorrelation';

const modelReport: AIReport = {
  title: 'Model title',
  severity: 'high',
  category: 'Database',
  keyLines: [],
  causes: ['The model says something'],
  debugSteps: [],
  bugReportMarkdown: '## Model title',
};

const INCIDENT = [
  '2026-11-03T09:14:07Z ERROR connect ECONNREFUSED 10.0.2.15:5432',
  "2026-11-03T09:14:09Z ERROR TypeError: Cannot read properties of undefined (reading 'rows')",
  '    at getOrders (/app/src/orders.js:42:18)',
  '2026-11-03T09:14:12Z ERROR Failed password for root from 203.0.113.7 port 52211 ssh2',
].join('\n');

describe('addCorrelation', () => {
  it('adds the order of events, the findings and the timeline to a model report', () => {
    const report = addCorrelation(modelReport, INCIDENT, 'high', 'en');

    expect(report.overview?.[0]).toContain('ECONNREFUSED');
    expect(report.timeline?.find((entry) => entry.role === 'root')?.title).toContain(
      'ECONNREFUSED',
    );
    expect(report.findings?.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps the model text and does not overwrite the causes', () => {
    const report = addCorrelation(modelReport, INCIDENT, 'high', 'en');

    expect(report.title).toBe('Model title');
    expect(report.causes).toEqual(['The model says something']);
  });

  it('adds nothing when the log has a single event', () => {
    const report = addCorrelation(modelReport, 'ERROR disk full', 'high', 'en');

    expect(report.overview).toBeUndefined();
    expect(report.timeline).toBeUndefined();
    expect(report.findings).toBeUndefined();
  });

  it('keeps an overview that the rules engine already wrote', () => {
    const withOverview = { ...modelReport, overview: ['Already explained.'] };

    expect(addCorrelation(withOverview, INCIDENT, 'high', 'en')).toBe(withOverview);
  });
});
