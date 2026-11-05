import { describe, expect, it } from 'vitest';

import { EXPORT_TEXT } from '../../../content/workbenchExport';
import type { AnalysisRecord } from '../../../lib/types';
import { parseLines } from '../../core/basicParse';
import { buildPagerDutyPayload, buildSlackMessage } from './alertFormats';
import { buildExportDocuments, formatNeedsAnalysis, safeFileStem } from './exportDocuments';
import type { ExportInput } from './exportTypes';
import { computeLineStatistics } from './lineStatistics';
import { buildPostMortem } from './postMortem';
import { buildStructuredJson } from './structuredJson';

const LOG = [
  '2026-11-03T10:00:00Z INFO [api] started',
  '2026-11-03T10:00:05Z ERROR [db] connection timeout latency=300ms',
  '2026-11-03T10:00:09Z ERROR [api] request failed latency=900ms',
  'plain line without level',
].join('\n');

it('computes a time range for a large number of lines', () => {
  const line = parseLines('2026-11-03T10:00:00Z INFO started')[0];
  const lines = Array.from({ length: 200_000 }, () => line);
  const result = computeLineStatistics(lines);
  expect(result.firstTime).toBe('2026-11-03T10:00:00.000Z');
  expect(result.lastTime).toBe('2026-11-03T10:00:00.000Z');
});

const RECORD: AnalysisRecord = {
  id: 'abc-123',
  createdAt: '2026-11-03T10:05:00.000Z',
  source: 'paste',
  fileName: null,
  rawLog: LOG,
  title: 'Database <timeout> & retries',
  severity: 'high',
  category: 'database',
  helpful: null,
  shareToken: null,
  report: {
    keyLines: ['ERROR [db] connection `timeout`\nsecond'],
    causes: ['Connection pool exhausted'],
    debugSteps: ['Check pool size', 'Restart the service'],
    bugReportMarkdown: '# Bug report\n\nBody',
    overview: ['The database stopped answering.'],
    findings: [
      { title: 'Timeout', severity: 'high', category: 'database', evidence: 'connection timeout' },
    ],
    timeline: [
      {
        time: '10:00:05',
        title: 'Timeout',
        category: 'database',
        severity: 'high',
        role: 'root',
        evidence: 'ERROR [db] connection timeout',
      },
      {
        title: 'Request failed',
        category: 'api',
        severity: 'medium',
        role: 'effect',
        evidence: 'request failed',
        causedBy: 0,
      },
    ],
  },
};

function inputOf(record: AnalysisRecord | null, language: 'en' | 'it' = 'en'): ExportInput {
  return { language, fileName: 'checkout.log', lines: parseLines(LOG), record };
}

describe('Slack message', () => {
  it('has severity, title, impact, evidence and a link placeholder', () => {
    const message = buildSlackMessage({ ...inputOf(RECORD), record: RECORD }, EXPORT_TEXT.en);
    const rows = message.split('\n');
    expect(rows[0]).toBe('*[HIGH] Database &lt;timeout&gt; &amp; retries*');
    expect(rows[1]).toBe('*Impact:* 2 fault lines in 4 lines, category database');
    expect(rows[2]).toBe("*Top evidence:* `ERROR [db] connection 'timeout' second`");
    expect(rows[3]).toBe('*Report:* <REPORT_LINK>');
  });

  it('is written in Italian for an Italian page and has no emoji', () => {
    const message = buildSlackMessage({ ...inputOf(RECORD, 'it'), record: RECORD }, EXPORT_TEXT.it);
    expect(message).toContain('*Impatto:*');
    expect(message).toContain('<LINK_AL_REPORT>');
    expect(message).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('leaves out the evidence row when the report has none', () => {
    const bare = { ...RECORD, report: { ...RECORD.report, keyLines: [], findings: undefined } };
    const message = buildSlackMessage({ ...inputOf(bare), record: bare }, EXPORT_TEXT.en);
    expect(message).not.toContain('Top evidence');
  });
});

describe('PagerDuty payload', () => {
  const parse = (record: AnalysisRecord) =>
    JSON.parse(buildPagerDutyPayload({ ...inputOf(record), record }));

  it('is an Events API v2 trigger with a routing key placeholder', () => {
    const event = parse(RECORD);
    expect(event.routing_key).toBe('<ROUTING_KEY>');
    expect(event.event_action).toBe('trigger');
    expect(event.payload).toMatchObject({
      summary: 'Database <timeout> & retries',
      source: 'checkout.log',
      severity: 'error',
      timestamp: '2026-11-03T10:05:00.000Z',
    });
    expect(event.payload.custom_details).toMatchObject({ fault_lines: 2, total_lines: 4 });
  });

  it.each([
    ['critical', 'critical'],
    ['high', 'error'],
    ['medium', 'warning'],
    ['low', 'info'],
    ['informational', 'info'],
  ] as const)('maps %s to %s', (severity, expected) => {
    expect(parse({ ...RECORD, severity }).payload.severity).toBe(expected);
  });

  it('cuts a summary longer than PagerDuty allows', () => {
    const event = parse({ ...RECORD, title: 'x'.repeat(2000) });
    expect(event.payload.summary).toHaveLength(1024);
  });
});

describe('post-mortem', () => {
  const report = buildPostMortem({ ...inputOf(RECORD), record: RECORD }, EXPORT_TEXT.en);

  it('has every section in order', () => {
    const headings = report.split('\n').filter((row) => row.startsWith('## '));
    expect(headings).toEqual([
      '## Summary',
      '## Impact',
      '## Timeline',
      '## Root cause',
      '## Resolution and mitigation',
      '## Action items',
      '## Lessons learned',
    ]);
  });

  it('fills the sections from the report', () => {
    expect(report).toContain('# Post-mortem: Database <timeout> & retries');
    expect(report).toContain('The database stopped answering.');
    expect(report).toContain('- **10:00:05** Timeout (root cause) `ERROR [db] connection timeout`');
    expect(report).toContain('- **no time** Request failed (effect)');
    expect(report).toContain('- Connection pool exhausted');
    expect(report).toContain('- [ ] Check pool size');
    expect(report).toContain('- [ ] Add a test that reproduces the failure');
  });

  it('says what is unknown instead of inventing it', () => {
    const bare = {
      ...RECORD,
      report: { ...RECORD.report, causes: [], debugSteps: [], timeline: undefined },
    };
    const text = buildPostMortem({ ...inputOf(bare), record: bare }, EXPORT_TEXT.en);
    expect(text).toContain('Not determined by the analysis');
    expect(text).toContain('No steps were suggested');
  });

  it('follows the page language', () => {
    const italian = buildPostMortem({ ...inputOf(RECORD, 'it'), record: RECORD }, EXPORT_TEXT.it);
    expect(italian).toContain('## Causa radice');
    expect(italian).toContain('- **10:00:05** Timeout (causa radice)');
  });
});

describe('line statistics', () => {
  it('counts levels, faults, time span, services and latency', () => {
    const stats = computeLineStatistics(parseLines(LOG));
    expect(stats.totalLines).toBe(4);
    expect(stats.levels).toEqual({ INFO: 1, ERROR: 2 });
    expect(stats.linesWithoutLevel).toBe(1);
    expect(stats.faultLines).toBe(2);
    expect(stats.firstTime).toBe('2026-11-03T10:00:00.000Z');
    expect(stats.lastTime).toBe('2026-11-03T10:00:09.000Z');
    expect(stats.services).toEqual([
      { name: 'api', count: 2 },
      { name: 'db', count: 1 },
    ]);
    expect(stats.latency).toEqual({ samples: 2, averageMs: 600, p95Ms: 900, maxMs: 900 });
  });

  it('is empty for no lines', () => {
    expect(computeLineStatistics([])).toEqual({
      totalLines: 0,
      levels: {},
      linesWithoutLevel: 0,
      faultLines: 0,
      firstTime: null,
      lastTime: null,
      services: [],
      latency: null,
    });
  });
});

describe('structured JSON', () => {
  it('holds statistics and the analysis without the raw log', () => {
    const data = JSON.parse(buildStructuredJson(inputOf(RECORD)));
    expect(data.statistics.totalLines).toBe(4);
    expect(data.analysis.title).toBe(RECORD.title);
    expect(data.analysis.rawLog).toBeUndefined();
    expect(data.file).toBe('checkout.log');
  });

  it('works without an analysis', () => {
    const data = JSON.parse(buildStructuredJson(inputOf(null)));
    expect(data.analysis).toBeNull();
    expect(data.statistics.totalLines).toBe(4);
  });
});

describe('buildExportDocuments', () => {
  it('returns the issue text untouched for the GitHub format', () => {
    const [issue] = buildExportDocuments('github', inputOf(RECORD), EXPORT_TEXT.en);
    expect(issue.content).toBe('# Bug report\n\nBody');
    expect(issue.filename).toBe('loglens-abc-123-issue.md');
  });

  it('returns two documents for the alert format with the right extensions', () => {
    const documents = buildExportDocuments('alert', inputOf(RECORD), EXPORT_TEXT.en);
    expect(documents.map((entry) => entry.filename)).toEqual([
      'loglens-abc-123-slack.txt',
      'loglens-abc-123-pagerduty.json',
    ]);
  });

  it('returns nothing for a format that needs an analysis when there is none', () => {
    for (const format of ['github', 'alert', 'postmortem'] as const) {
      expect(buildExportDocuments(format, inputOf(null), EXPORT_TEXT.en)).toEqual([]);
      expect(formatNeedsAnalysis(format)).toBe(true);
    }
    expect(buildExportDocuments('json', inputOf(null), EXPORT_TEXT.en)).toHaveLength(1);
    expect(formatNeedsAnalysis('json')).toBe(false);
  });
});

describe('safeFileStem', () => {
  it('keeps letters, digits, dash and underscore only', () => {
    expect(safeFileStem('../../my log (1).txt', 'x')).toBe('my-log-1');
    expect(safeFileStem('a"; rm -rf /', 'x')).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('falls back when nothing is left', () => {
    expect(safeFileStem('???', 'log')).toBe('log');
    expect(safeFileStem(null, 'log')).toBe('log');
  });
});
