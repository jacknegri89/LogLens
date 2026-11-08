/**
 * An HTTP status that a line carries without a parser for its format: HAProxy and AWS load
 * balancer logs and simple CSV access logs. The format parsers cannot all know every proxy, so the
 * status is read here from the shapes those lines have, and only when the event has none yet.
 */

const METHODS = 'GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS';

const REASON_PHRASES =
  'Bad Request|Unauthorized|Forbidden|Not Found|Method Not Allowed|Conflict|Gone|Too Many Requests|Internal Server Error|Bad Gateway|Service Unavailable|Gateway Timeout';

const STATUS_SHAPES: RegExp[] = [
  // IIS without a header: ... 500 GET /api/orders ...
  new RegExp(String.raw`\s([1-5]\d{2}) (?:${METHODS}) \S`),
  // A status with its reason phrase: 409 Conflict, 404 Not Found
  new RegExp(String.raw`(?:^|[\s"])([45]\d{2}) (?:${REASON_PHRASES})\b`),
  // HAProxy: [04/Nov/2026:10:00:03.456] fe be/app1 0/0/-1/-1/30001 504 194
  /\[\d{2}\/\w{3}\/\d{4}:[\d:.]+\] \S+ \S+\/\S+ \S+ (\d{3}) \d+/,
  // AWS ELB/ALB: ... 0.001 5.002 0.000 502 502 34 366 "GET http://..."
  new RegExp(`\\s(\\d{3}) (?:\\d{3}|-) \\d+ \\d+ "(?:${METHODS}) `),
  // CSV: 2026-11-04T10:00:02Z,POST,/checkout,503,3000
  new RegExp(`^[^,]{1,60},(?:${METHODS}),[^,]{1,2000},(\\d{3})(?:,|$)`),
];

const MIN_STATUS = 100;
const MAX_STATUS = 599;

/** The status code of an access line of a known shape, or null. */
export function inferStatus(firstLine: string): number | null {
  for (const shape of STATUS_SHAPES) {
    const match = shape.exec(firstLine);
    if (match === null) {
      continue;
    }
    const status = Number(match[1]);
    if (status >= MIN_STATUS && status <= MAX_STATUS) {
      return status;
    }
  }
  return null;
}
