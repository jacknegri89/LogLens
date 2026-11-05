import { describe, expect, it } from 'vitest';

import { isSensitiveRequestUrl } from './app';

describe('request logging', () => {
  it.each(['/api/shared/secret-token', '/API/SHARED/secret-token?x=1', '/api/shared?token=secret'])(
    'does not log the shared-report URL %s',
    (url) => {
      expect(isSensitiveRequestUrl(url)).toBe(true);
    },
  );

  it('continues to log unrelated routes', () => {
    expect(isSensitiveRequestUrl('/api/analyses')).toBe(false);
  });
});
