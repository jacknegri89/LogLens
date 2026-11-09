import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ttlRegression } from '../../benchmarks/fixtures/ttlRegression';
import { RulesProvider } from '../ai/providers/rulesProvider';
import { createApp } from '../app';

const VISITOR_ID = 'visitor-0123456789abcdef';

vi.mock('../ai', () => ({
  getAIProvider: () => new RulesProvider(),
}));

const { createAnalysis } = vi.hoisted(() => ({
  createAnalysis: vi.fn(),
}));

// The database is out of scope here: the repository only records what it is asked to save.
vi.mock('../repositories/analysisRepository', () => ({
  deleteAnalysesOlderThan: vi.fn().mockResolvedValue(0),
  tryReserveAttempt: vi.fn().mockResolvedValue('allowed'),
  createAnalysis,
  createShareToken: vi.fn(),
  deleteAnalysesByOwner: vi.fn(),
  getAnalysisById: vi.fn(),
  getSharedAnalysis: vi.fn(),
  listAnalysisSummaries: vi.fn(),
  revokeShareToken: vi.fn(),
  setFeedback: vi.fn(),
}));

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(() => {
  createAnalysis.mockReset();
  createAnalysis.mockResolvedValue({ id: 'analysis-1' });
});

function post(rawLog: unknown, language?: string): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Visitor-Id': VISITOR_ID,
  };
  if (language !== undefined) {
    headers['X-Language'] = language;
  }
  return fetch(`${baseUrl}/api/analyses`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ rawLog, source: 'paste' }),
  });
}

function savedReport(): Record<string, unknown> {
  const call = createAnalysis.mock.calls[0][0] as { report: Record<string, unknown> };
  return call.report;
}

describe('POST /api/analyses with the correlation engine', () => {
  it('saves the incidents, the engine and the coverage with the report', async () => {
    const response = await post(ttlRegression.log);

    expect(response.status).toBe(201);
    const report = savedReport();
    expect(report.incidents).toHaveLength(2);
    expect(report.engine).toMatchObject({ used: 'rules', aiUsed: false });
    expect(report.coverage).toMatchObject({ complete: true });
    // The report is stored as JSON: it must survive the trip.
    expect(JSON.parse(JSON.stringify(report))).toEqual(report);
  });

  it('writes the incident text in the language of the request', async () => {
    await post(ttlRegression.log, 'it');

    const incidents = savedReport().incidents as { rootCause: { summary: string } }[];
    expect(incidents[0].rootCause.summary).toContain('Causa confermata');
  });

  it('hides secrets in everything the correlation engine adds to the report', async () => {
    const log = [
      '2026-11-04T10:00:00Z INFO [api] login request_id=req-1 password=hunter2hunter2 token=abcdef123456',
      '2026-11-04T10:00:01Z ERROR [api] upstream failed request_id=req-1 password=hunter2hunter2',
    ].join('\n');

    await post(log);

    // The earlier fields (keyLines, causes) quote the lines as they are, as they always did, so
    // the page can number them; the new incident section is what must not carry a secret.
    const report = savedReport();
    const added = JSON.stringify({ incidents: report.incidents, engine: report.engine });
    expect(added).not.toContain('hunter2hunter2');
    expect(added).not.toContain('abcdef123456');
    expect(added).toContain('req-1');
    const markdown = String(report.bugReportMarkdown);
    const incidentSection = markdown.slice(markdown.indexOf('## Incidents'));
    expect(incidentSection).not.toContain('hunter2hunter2');
  });

  it('rejects an empty or invalid log without saving anything', async () => {
    expect((await post('   ')).status).toBe(400);
    expect((await post(42)).status).toBe(400);
    expect(createAnalysis).not.toHaveBeenCalled();
  });
});
