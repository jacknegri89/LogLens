import type { AttributeValue } from './normalizedEvent';

/**
 * Identifiers that a log writes in plain words instead of as key=value: a W3C `traceparent`,
 * "request id: req-77", "order O-1001". Each pattern is a plain character class with a small
 * bound, so scanning a hostile line stays linear.
 */

const SCAN_LENGTH = 3000;
const TRACEPARENT = /\b00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}\b/;
const WORDED_ID =
  /\b(trace|request|req|correlation|transaction|txn|session|deployment|release|job)[ _-]?id\s*[:=#]\s*"?([\w-]{4,64})/gi;
// "order O-1001", "order #1001", "order id 1001": the id must contain a digit, so "order status" is no id.
const ORDER_MENTION = /\border\s+(?:id\s+)?#?((?=[\w-]*\d)[A-Za-z0-9][\w-]{2,30})/i;

const KIND_BY_WORD: Record<string, string> = {
  trace: 'traceId',
  request: 'requestId',
  req: 'requestId',
  correlation: 'requestId',
  transaction: 'transactionId',
  txn: 'transactionId',
  session: 'sessionId',
  deployment: 'deploymentId',
  release: 'deploymentId',
  job: 'jobId',
};

export function extractFreeTextIdentifiers(text: string): Record<string, AttributeValue> {
  const scanned = text.slice(0, SCAN_LENGTH);
  const found: Record<string, AttributeValue> = {};
  const traceparent = TRACEPARENT.exec(scanned);
  if (traceparent) {
    found.traceId = traceparent[1];
    found.spanId = traceparent[2];
  }
  for (const match of scanned.matchAll(WORDED_ID)) {
    const kind = KIND_BY_WORD[match[1].toLowerCase()];
    if (kind !== undefined && !(kind in found)) {
      found[kind] = match[2];
    }
  }
  const order = ORDER_MENTION.exec(scanned);
  if (order && !('orderId' in found)) {
    found.orderId = order[1];
  }
  return found;
}
