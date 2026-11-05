import { describe, expect, it } from 'vitest';

import { readJsonResponse } from './readJsonResponse';

describe('readJsonResponse', () => {
  it('parses a valid response', async () => {
    await expect(readJsonResponse(Response.json({ ok: true }))).resolves.toEqual({ ok: true });
  });

  it('rejects responses larger than the byte limit', async () => {
    const response = new Response('x'.repeat(2 * 1024 * 1024 + 1));
    await expect(readJsonResponse(response)).rejects.toMatchObject({ statusCode: 502 });
  });

  it('rejects invalid JSON without exposing the response', async () => {
    const response = new Response('not JSON');
    await expect(readJsonResponse(response)).rejects.toMatchObject({
      statusCode: 502,
      message: 'The AI service returned invalid JSON.',
    });
  });
});
