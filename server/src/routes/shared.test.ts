import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app';

const { getSharedAnalysis } = vi.hoisted(() => ({ getSharedAnalysis: vi.fn() }));

vi.mock('../repositories/analysisRepository', () => ({ getSharedAnalysis }));

describe('GET /api/shared/:token', () => {
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
    getSharedAnalysis.mockReset();
  });

  it('is never cached, indexed or passed on in a Referer header', async () => {
    getSharedAnalysis.mockResolvedValueOnce({ id: 'a', title: 'T', report: {} });

    const response = await fetch(`${baseUrl}/api/shared/some-token`);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-robots-tag')).toContain('noindex');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  });

  it('stops answering as soon as the link is revoked, and the refusal is not cached either', async () => {
    getSharedAnalysis.mockResolvedValueOnce(null);

    const response = await fetch(`${baseUrl}/api/shared/revoked-token`);

    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = (await response.json()) as { error: { message: string } };
    expect(body.error.message).toContain('revoked');
  });

  it('looks the report up by the token alone, without any visitor id', async () => {
    getSharedAnalysis.mockResolvedValueOnce(null);

    await fetch(`${baseUrl}/api/shared/the-token`);

    expect(getSharedAnalysis).toHaveBeenCalledWith('the-token');
  });
});
