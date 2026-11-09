import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app';

const VISITOR_ID = 'visitor-0123456789abcdef';

const { deleteAnalysisById } = vi.hoisted(() => ({
  deleteAnalysisById: vi.fn<(id: string, owner: string) => Promise<boolean>>(),
}));

vi.mock('../repositories/analysisRepository', () => ({
  deleteAnalysesOlderThan: vi.fn().mockResolvedValue(0),
  tryReserveAttempt: vi.fn().mockResolvedValue('allowed'),
  createAnalysis: vi.fn(),
  createShareToken: vi.fn(),
  deleteAnalysesByOwner: vi.fn(),
  deleteAnalysisById: (id: string, owner: string) => deleteAnalysisById(id, owner),
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

beforeEach(() => deleteAnalysisById.mockReset());

function remove(id: string, headers: Record<string, string>) {
  return fetch(`${baseUrl}/api/analyses/${id}`, { method: 'DELETE', headers });
}

describe('DELETE /api/analyses/:id', () => {
  it('removes one analysis of the visitor', async () => {
    deleteAnalysisById.mockResolvedValue(true);

    const response = await remove('abc', { 'X-Visitor-Id': VISITOR_ID });

    expect(response.status).toBe(200);
    expect(deleteAnalysisById).toHaveBeenCalledWith('abc', VISITOR_ID);
  });

  it('answers 404 when the analysis is not theirs or does not exist', async () => {
    deleteAnalysisById.mockResolvedValue(false);

    expect((await remove('abc', { 'X-Visitor-Id': VISITOR_ID })).status).toBe(404);
  });

  it('refuses a call without a visitor id', async () => {
    expect((await remove('abc', {})).status).toBe(400);
    expect(deleteAnalysisById).not.toHaveBeenCalled();
  });
});

describe('JSON request validation', () => {
  it('returns 400 for malformed JSON', async () => {
    const response = await fetch(`${baseUrl}/api/analyses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Visitor-Id': VISITOR_ID },
      body: '{invalid',
    });
    expect(response.status).toBe(400);
  });

  it('returns 413 for a body larger than the parser limit', async () => {
    const response = await fetch(`${baseUrl}/api/analyses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Visitor-Id': VISITOR_ID },
      body: JSON.stringify({ rawLog: 'x'.repeat(2 * 1024 * 1024 + 1) }),
    });
    expect(response.status).toBe(413);
  });
});
