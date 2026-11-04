import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app';

const { CRON_SECRET, deleteAnalysesOlderThan } = vi.hoisted(() => ({
  CRON_SECRET: 'cron-secret-0123456789',
  deleteAnalysesOlderThan: vi.fn<(days: number) => Promise<number>>(),
}));

vi.mock('../repositories/analysisRepository', () => ({
  deleteAnalysesOlderThan: (days: number) => deleteAnalysesOlderThan(days),
}));

vi.mock('../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config/env')>();
  return { env: { ...actual.env, CRON_SECRET } };
});

describe('GET /api/cron/retention', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createApp().listen(0);
    await new Promise<void>((resolve) => server.once('listening', () => resolve()));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  beforeEach(() => {
    vi.clearAllMocks();
    deleteAnalysesOlderThan.mockResolvedValue(2);
  });

  it('refuses a call without the secret and deletes nothing', async () => {
    const response = await fetch(`${baseUrl}/api/cron/retention`);

    expect(response.status).toBe(401);
    expect(deleteAnalysesOlderThan).not.toHaveBeenCalled();
  });

  it('refuses a call with the wrong secret', async () => {
    const response = await fetch(`${baseUrl}/api/cron/retention`, {
      headers: { authorization: 'Bearer not-the-secret-0000' },
    });

    expect(response.status).toBe(401);
    expect(deleteAnalysesOlderThan).not.toHaveBeenCalled();
  });

  it('runs the cleanup with 90 days of retention when the secret matches', async () => {
    const response = await fetch(`${baseUrl}/api/cron/retention`, {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: 2 });
    expect(deleteAnalysesOlderThan).toHaveBeenCalledWith(90);
  });
});
