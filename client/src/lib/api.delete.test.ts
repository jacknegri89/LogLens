import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from './api';
import { clearLocalAnalyses, removeLocalAnalysis } from './localHistory';

vi.mock('./localHistory', () => ({
  clearLocalAnalyses: vi.fn(),
  removeLocalAnalysis: vi.fn(),
  getLocalAnalysis: vi.fn(),
  listLocalAnalyses: vi.fn(),
  saveLocalAnalysis: vi.fn(),
}));
vi.mock('./visitor', () => ({ getVisitorId: () => 'visitor-id' }));
vi.mock('../i18n/languages', () => ({ detectLanguage: () => 'en' }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('deleting history', () => {
  it('keeps the local copy when the server cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));

    await expect(api.deleteAnalysis('one')).rejects.toThrow('offline');
    await expect(api.deleteAnalyses()).rejects.toThrow('offline');
    expect(removeLocalAnalysis).not.toHaveBeenCalled();
    expect(clearLocalAnalyses).not.toHaveBeenCalled();
  });

  it('removes the local copy after the server confirms deletion', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => new Response('{"deleted":1}', { status: 200 })),
    );

    await api.deleteAnalysis('one');
    await api.deleteAnalyses();
    expect(removeLocalAnalysis).toHaveBeenCalledWith('one');
    expect(clearLocalAnalyses).toHaveBeenCalledOnce();
  });

  it('removes a stale local copy when the server reports it missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 404 })));

    await expect(api.deleteAnalysis('one')).rejects.toMatchObject({ status: 404 });
    expect(removeLocalAnalysis).toHaveBeenCalledWith('one');
  });
});
