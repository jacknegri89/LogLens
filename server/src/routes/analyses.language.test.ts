import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AnalyzeInput } from '../ai/AIProvider';
import { createApp } from '../app';

const VISITOR_ID = 'visitor-0123456789abcdef';
const modelReport = {
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
  getAIProvider: () => ({ name: 'fake', analyze: (input: AnalyzeInput) => analyze(input) }),
}));

// The database is out of scope here: every repository call answers as if the visitor were new.
vi.mock('../repositories/analysisRepository', () => ({
  deleteExpiredAttempts: vi.fn().mockResolvedValue(0),
  recordAttempt: vi.fn().mockResolvedValue('attempt-1'),
  removeAttempt: vi.fn().mockResolvedValue(undefined),
  countAttemptsInLastHour: vi.fn().mockResolvedValue(1),
  createAnalysis: vi.fn().mockResolvedValue({ id: 'analysis-1' }),
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
  analyze.mockReset();
  analyze.mockResolvedValue(modelReport);
});

async function postLog(languageHeader?: string): Promise<Response> {
  return fetch(`${baseUrl}/api/analyses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Visitor-Id': VISITOR_ID,
      ...(languageHeader === undefined ? {} : { 'X-Language': languageHeader }),
    },
    body: JSON.stringify({ rawLog: 'ERROR disk full' }),
  });
}

async function languageSentToProvider(languageHeader?: string): Promise<string | undefined> {
  const response = await postLog(languageHeader);

  expect(response.status).toBe(201);
  return analyze.mock.calls[0]?.[0].language;
}

describe('POST /api/analyses language', () => {
  it.each(['it', 'IT', 'it-IT'])(
    'sends Italian to the provider for X-Language: %s',
    async (header) => {
      expect(await languageSentToProvider(header)).toBe('it');
    },
  );

  it('sends English to the provider for X-Language: en', async () => {
    expect(await languageSentToProvider('en')).toBe('en');
  });

  it.each(['fr', 'klingon', ''])('falls back to English for X-Language: %j', async (header) => {
    expect(await languageSentToProvider(header)).toBe('en');
  });

  it('falls back to English when the header is missing', async () => {
    expect(await languageSentToProvider()).toBe('en');
  });
});
