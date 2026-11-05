import { describe, expect, it, vi } from 'vitest';

import type { AnalysisReport } from '../types/report';
import { getSharedAnalysis, toSharedReport } from './analysisRepository';

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock('../db/prisma', () => ({ prisma: { analysis: { findUnique } } }));

const report: AnalysisReport = {
  keyLines: ['ERROR boom'],
  causes: [],
  debugSteps: [],
  bugReportMarkdown: '## boom',
  format: 'Syslog',
  findings: [{ title: 'boom', severity: 'high', category: 'Runtime', evidence: 'ERROR boom' }],
};

it('loads only the columns required for a shared report', async () => {
  findUnique.mockResolvedValueOnce({
    id: 'id',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    title: 'Failure',
    severity: 'high',
    category: 'runtime',
    report: JSON.stringify(report),
  });
  const shared = await getSharedAnalysis('share-token');
  expect(shared?.report.keyLines).toEqual(['ERROR boom']);
  expect(findUnique).toHaveBeenCalledWith({
    where: { shareToken: 'share-token' },
    select: {
      id: true,
      createdAt: true,
      title: true,
      severity: true,
      category: true,
      report: true,
    },
  });
});

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

  it('passes the timeline through', () => {
    const timeline = [
      {
        title: 'boom',
        category: 'Runtime',
        severity: 'high',
        role: 'root',
        evidence: 'ERROR boom',
      },
    ] as const;

    expect(toSharedReport({ ...report, timeline: [...timeline] }).timeline).toEqual(timeline);
  });

  it('stays valid for an older report that has neither', () => {
    const { format: _format, findings: _findings, ...older } = report;

    const shared = toSharedReport(older);

    expect(shared.format).toBeUndefined();
    expect(shared.keyLines).toEqual(['ERROR boom']);
  });
});
