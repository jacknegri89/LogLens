/**
 * Decorative log lines that scroll behind the Analyze headline. They are made up,
 * use documentation-only IP ranges (RFC 5737) and never come from a real system.
 */
export interface StreamTemplate {
  text: string;
  flagged: boolean;
}

export const STREAM_TEXT = {
  flagTag: 'possible break-in attempt',
};

/** First timestamp of the stream, in seconds after midnight (03:12:40). */
export const STREAM_START_SECONDS = 11_560;

export const STREAM_TEMPLATES: StreamTemplate[] = [
  { text: 'INFO  nginx   GET /healthz 200 1ms', flagged: false },
  { text: 'INFO  api     worker 2 ready (pid 4182)', flagged: false },
  { text: 'DEBUG cache   hit ratio 0.93 over 5m', flagged: false },
  { text: 'INFO  sshd    Accepted publickey for deploy from 198.51.100.7', flagged: false },
  { text: 'WARN  db      slow query 1840ms on orders_by_day', flagged: false },
  { text: 'INFO  nginx   POST /api/analyses 201 96ms', flagged: false },
  { text: 'DEBUG queue   12 jobs pending, 0 retries', flagged: false },
  { text: 'WARN  sshd    Failed password for admin from 203.0.113.42', flagged: false },
  { text: 'INFO  cron    rotate-logs finished in 2.1s', flagged: false },
  {
    text: 'ERROR sshd    14 failed logins for root from 203.0.113.42 in 60s',
    flagged: true,
  },
  { text: 'INFO  api     GET /api/history 200 18ms', flagged: false },
  { text: 'DEBUG tls     session resumed for 198.51.100.23', flagged: false },
  { text: 'WARN  api     rate limit reached for 203.0.113.9', flagged: false },
  { text: 'INFO  nginx   GET /assets/app.js 304 0ms', flagged: false },
  { text: 'DEBUG gc      pause 4ms, heap 212MB', flagged: false },
  { text: 'INFO  backup  snapshot 2/3 uploaded', flagged: false },
  { text: 'ERROR api     ECONNRESET while reading from upstream', flagged: false },
  { text: 'INFO  api     health check passed', flagged: false },
];
