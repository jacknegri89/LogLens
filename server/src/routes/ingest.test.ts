import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const INGEST_TOKEN = 'ingest-secret-token-0123456789';
const VISITOR_ID = 'visitor-0123456789abcdef';

const { createAnalysis } = vi.hoisted(() => {
  process.env.INGEST_TOKEN = 'ingest-secret-token-0123456789';
  return { createAnalysis: vi.fn() };
});

import { createApp } from '../app';
import { isValidIngestToken } from './ingest';

vi.mock('../repositories/analysisRepository', () => ({
  recordAttempt: vi.fn().mockResolvedValue('attempt-1'),
  removeAttempt: vi.fn().mockResolvedValue(undefined),
  countAttemptsInLastHour: vi.fn().mockResolvedValue(1),
  createAnalysis: (input: unknown) => createAnalysis(input),
  createShareToken: vi.fn(),
  deleteAnalysesByOwner: vi.fn(),
  deleteAnalysisById: vi.fn(),
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
  createAnalysis.mockImplementation(
    (input: { title: string; severity: string; category: string }) =>
      Promise.resolve({ id: 'ingested-1', createdAt: new Date(0), ...input }),
  );
});

function ingest(body: unknown, headers: Record<string, string> = {}) {
  return fetch(`${baseUrl}/api/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

const authorized = { Authorization: `Bearer ${INGEST_TOKEN}` };
const validBody = { rawLog: '2026-11-03T09:14:07Z ERROR connect ECONNREFUSED 10.0.2.15:5432' };

describe('POST /api/ingest', () => {
  it('saves and analyzes a log sent with the token, under the ingest owner', async () => {
    const response = await ingest(validBody, authorized);
    const body = (await response.json()) as { id: string; category: string };

    expect(response.status).toBe(201);
    expect(body.id).toBe('ingested-1');
    expect(body.category).toBe('Database');
    expect(createAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ owner: 'ingest', source: 'ingest' }),
    );
  });

  it('files the log under the visitor when a valid X-Visitor-Id is sent', async () => {
    await ingest(validBody, { ...authorized, 'X-Visitor-Id': VISITOR_ID });

    expect(createAnalysis).toHaveBeenCalledWith(expect.objectContaining({ owner: VISITOR_ID }));
  });

  it.each([
    ['no token', {}],
    ['a wrong token', { Authorization: 'Bearer wrong-token-0123456789abcdef' }],
    ['a token without Bearer', { Authorization: INGEST_TOKEN }],
  ])('refuses a call with %s', async (_name, headers) => {
    const response = await ingest(validBody, headers);

    expect(response.status).toBe(401);
    expect(createAnalysis).not.toHaveBeenCalled();
  });

  it('refuses an invalid body', async () => {
    const response = await ingest({ rawLog: '' }, authorized);

    expect(response.status).toBe(400);
  });
});

describe('isValidIngestToken', () => {
  it('accepts only the exact secret in a Bearer header', () => {
    expect(isValidIngestToken(`Bearer ${INGEST_TOKEN}`, INGEST_TOKEN)).toBe(true);
    expect(isValidIngestToken(`Bearer ${INGEST_TOKEN}x`, INGEST_TOKEN)).toBe(false);
    expect(isValidIngestToken(undefined, INGEST_TOKEN)).toBe(false);
  });
});
