/** Sample logs so visitors can try LogLens without pasting their own. */
export const EXAMPLES: { label: string; content: string }[] = [
  {
    label: 'Node error',
    content: `2026-06-20T09:14:02.331Z INFO  Starting api server on port 3001
2026-06-20T09:14:11.882Z WARN  Slow request: GET /api/analyses took 1423ms
2026-06-20T09:14:23.104Z ERROR Unhandled promise rejection in request handler
TypeError: Cannot read properties of undefined (reading 'map')
    at buildReport (/app/server/src/services/report.ts:42:28)
    at AnalysisService.create (/app/server/src/services/analysis.ts:88:20)
2026-06-20T09:14:23.107Z ERROR Request failed: POST /api/analyses 500 (28ms)`,
  },
  {
    label: 'Docker',
    content: `node-api  | > node dist/index.js
node-api  | Error: listen EADDRINUSE: address already in use 0.0.0.0:3001
node-api  |     at Server.setupListenHandle [as _listen2] (node:net:1908:16)
postgres  | 2026-06-20 09:21:55.310 UTC [1] FATAL:  out of memory
node-api  | container "loglens-node-api" killed: OOMKilled (exit code 137)
docker-compose | service "node-api" failed to start: dependency failed to start`,
  },
  {
    label: 'Database',
    content: `2026-06-20T10:02:14.553Z ERROR PrismaClientInitializationError: Can't reach database server at \`db:5432\`
2026-06-20T10:02:14.560Z ERROR Failed to connect to database: connect ECONNREFUSED 172.18.0.2:5432
2026-06-20T10:05:41.220Z WARN  Retrying connection (attempt 3/5)...
2026-06-20T10:05:42.880Z ERROR QueryFailedError: duplicate key value violates unique constraint "users_email_key"
2026-06-20T10:05:42.881Z WARN  Transaction rolled back`,
  },
];
