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

  it('leaves other pages untouched', () => {
    const event = redactSharedLinks({ type: 'pageview', url: '/analyses/42' });
    expect(event.url).toBe('/analyses/42');
  });
});
