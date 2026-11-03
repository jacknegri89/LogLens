import { describe, expect, it, vi } from 'vitest';

import type { AnalysisReport } from '../types/report';
import { toSharedReport } from './analysisRepository';

vi.mock('../db/prisma', () => ({ prisma: {} }));

const report: AnalysisReport = {
  keyLines: ['ERROR boom'],
  causes: [],
  debugSteps: [],
  bugReportMarkdown: '## boom',
  format: 'Syslog',
  findings: [{ title: 'boom', severity: 'high', category: 'Runtime', evidence: 'ERROR boom' }],
};

describe('toSharedReport', () => {
  it('passes the format and the findings through', () => {
    const shared = toSharedReport(report);

    expect(shared.format).toBe('Syslog');
    expect(shared.findings).toEqual(report.findings);
  });

  it('passes the overview through', () => {
    const overview = ['Probable root cause: the database refused the connection.'];

    expect(toSharedReport({ ...report, overview }).overview).toEqual(overview);
  });

  it('stays valid for an older report that has neither', () => {
    const { format: _format, findings: _findings, ...older } = report;

    const shared = toSharedReport(older);

    expect(shared.format).toBeUndefined();
    expect(shared.keyLines).toEqual(['ERROR boom']);
  });
});
