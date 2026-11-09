import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from './api';
import { RequestError } from './requestError';

vi.mock('./localHistory', () => ({
  clearLocalAnalyses: vi.fn(),
  removeLocalAnalysis: vi.fn(),
  getLocalAnalysis: vi.fn().mockReturnValue(null),
  listLocalAnalyses: vi.fn().mockReturnValue([]),
  saveLocalAnalysis: vi.fn(),
}));
vi.mock('./visitor', () => ({ getVisitorId: () => 'visitor-id' }));
vi.mock('../i18n/languages', () => ({ detectLanguage: () => 'en' }));

afterEach(() => {
  vi.unstubAllGlobals();
});

function timeoutError(): DOMException {
  return new DOMException('The operation timed out.', 'TimeoutError');
}

describe('a request that takes too long', () => {
  it('is reported as a gateway timeout, which the pages already explain', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeoutError()));

    const failure = await api.getShared('token').catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(RequestError);
    expect((failure as RequestError).status).toBe(504);
  });

  it('gives every request a timeout signal, and an analysis a longer one than a read', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"items":[]}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const timeouts: number[] = [];
    const original = AbortSignal.timeout.bind(AbortSignal);
    vi.spyOn(AbortSignal, 'timeout').mockImplementation((milliseconds: number) => {
      timeouts.push(milliseconds);
      return original(milliseconds);
    });

    await api.listAnalyses();
    await api.createAnalysis({ rawLog: 'x' }).catch(() => undefined);

    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    expect(timeouts[0]).toBeLessThan(timeouts[1]);
    expect(timeouts[1]).toBeGreaterThan(60_000);
  });

  it('still stops at once when the visitor cancels', async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('x', 'AbortError')));
        });
      }),
    );

    const pending = api
      .createAnalysis({ rawLog: 'x' }, controller.signal)
      .catch((error: unknown) => error);
    controller.abort();

    expect(((await pending) as DOMException).name).toBe('AbortError');
  });
});

describe('an id put in an address', () => {
  it('is encoded, so it cannot change the path of the request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await api.createShare('../shared/x?y=1').catch(() => undefined);
    await api.revokeShare('a/b').catch(() => undefined);
    await api.setFeedback('a b', true).catch(() => undefined);

    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls[0]).toBe('/api/analyses/..%2Fshared%2Fx%3Fy%3D1/share');
    expect(urls[1]).toBe('/api/analyses/a%2Fb/share');
    expect(urls[2]).toBe('/api/analyses/a%20b/feedback');
  });
});
