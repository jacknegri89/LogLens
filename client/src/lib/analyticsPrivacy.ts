import type { BeforeSendEvent } from '@vercel/analytics';

/** The secret part of a shared-report address: everything after `/shared/` up to a query or hash. */
const SHARE_TOKEN_IN_URL = /\/shared\/[^/?#]+/;

/**
 * Runs before every analytics event. A share link carries the secret token of the report in its
 * path, so the token is replaced before the page view is sent. The event itself is kept.
 */
export function redactSharedLinks(event: BeforeSendEvent): BeforeSendEvent {
  return { ...event, url: event.url.replace(SHARE_TOKEN_IN_URL, '/shared/[redacted]') };
}
