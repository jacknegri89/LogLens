/** The printed log shown under the lens on the Analyze page. */
export interface PrintLine {
  text: string;
  failing: boolean;
}

export const PRINTOUT: PrintLine[] = [
  { text: '09:14:01 INFO  server listening on :8080', failing: false },
  { text: '09:14:01 INFO  loaded 3 routes from config', failing: false },
  { text: '09:14:02 DEBUG GET /health 200 2ms', failing: false },
  { text: '09:14:05 WARN  pool at 18/20 connections', failing: false },
  { text: '09:14:07 ERROR connect ECONNREFUSED 10.0.2.15:5432', failing: true },
  { text: '09:14:07 INFO  retrying in 500ms (attempt 1/5)', failing: false },
  { text: '09:14:08 DEBUG GET /api/users 200 41ms', failing: false },
  { text: '09:14:11 ERROR unhandled rejection: TypeError', failing: true },
  { text: '          at buildReport (report.ts:42:28)', failing: true },
  { text: '09:14:11 INFO  worker 4 restarted', failing: false },
  { text: '09:14:15 DEBUG POST /api/analyses 201 118ms', failing: false },
  { text: '09:14:19 WARN  slow query: 2341ms', failing: false },
  { text: '09:14:22 INFO  health check passed', failing: false },
  { text: '09:14:26 DEBUG cache hit ratio 0.91', failing: false },
  { text: '09:14:30 INFO  scheduled job finished', failing: false },
];
