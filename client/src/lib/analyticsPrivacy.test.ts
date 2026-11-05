import { describe, expect, it } from 'vitest';

import { redactSharedLinks } from './analyticsPrivacy';

describe('redactSharedLinks', () => {
  it('removes the secret token of a shared report from the path', () => {
    const event = redactSharedLinks({ type: 'pageview', url: '/shared/abc123SECRET' });
    expect(event).toEqual({ type: 'pageview', url: '/shared/[redacted]' });
  });

  it('removes the token when the address is a full URL', () => {
    const event = redactSharedLinks({
      type: 'pageview',
      url: 'https://loglens-demo.vercel.app/shared/abc123SECRET?x=1',
    });
    expect(event.url).toBe('https://loglens-demo.vercel.app/shared/[redacted]?x=1');
  });

  it.each(['/SHARED/abc123SECRET', '/s%68ared/abc123SECRET', '/shared%2Fabc123SECRET'])(
    'removes a token from a differently encoded shared path: %s',
    (url) => {
      expect(redactSharedLinks({ type: 'pageview', url }).url).toBe('/shared/[redacted]');
    },
  );

  it('leaves other pages untouched', () => {
    const event = redactSharedLinks({ type: 'pageview', url: '/analyses/42' });
    expect(event.url).toBe('/analyses/42');
  });

  it('removes a permalink fragment before sending analytics', () => {
    const event = redactSharedLinks({ type: 'pageview', url: '/workbench#s=private-data' });
    expect(event.url).toBe('/workbench');
  });
});
