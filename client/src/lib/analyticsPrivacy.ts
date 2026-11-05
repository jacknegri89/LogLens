import type { BeforeSendEvent } from '@vercel/analytics';

/** The secret part of a shared-report address: everything after `/shared/` up to a query or hash. */
// React Router accepts mixed case and percent-encoded path characters.
const SHARE_TOKEN_IN_URL =
  /(?:\/|%2f)(?:s|%73)(?:h|%68)(?:a|%61)(?:r|%72)(?:e|%65)(?:d|%64)(?:\/|%2f)[^/?#]+/i;

/**
 * Runs before every analytics event. A share link carries the secret token of the report in its
 * path, so the token is replaced before the page view is sent. The event itself is kept.
 */
export function redactSharedLinks(event: BeforeSendEvent): BeforeSendEvent {
  const withoutFragment = event.url.split('#', 1)[0];
  return { ...event, url: withoutFragment.replace(SHARE_TOKEN_IN_URL, '/shared/[redacted]') };
}
