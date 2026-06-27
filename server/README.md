# server

The LogLens backend: **Node.js + Express + TypeScript**.

## Run

```bash
npm install
npm run dev     # starts http://localhost:3001 with auto-reload
```

Check it's alive:

```bash
curl http://localhost:3001/api/health
# { "status": "ok", "service": "loglens-server", "timestamp": "..." }
```

## Scripts

| Script              | What it does                            |
| ------------------- | --------------------------------------- |
| `npm run dev`       | Start with auto-reload (tsx)            |
| `npm run build`     | Compile to `dist/` (tsup)               |
| `npm start`         | Run the compiled server from `dist/`    |
| `npm run typecheck` | Type-check the project without emitting |

## Structure

```text
src/
├── index.ts             # entry point: starts the HTTP server
├── app.ts               # builds the Express app (middleware + routes)
├── config/
│   └── env.ts           # validated environment variables (Zod)
├── routes/
│   └── health.ts        # GET /api/health
└── middleware/
    ├── errorHandler.ts  # centralized error handling
    └── notFound.ts      # 404 JSON fallback
```

## API

| Method | Path          | Description    |
| ------ | ------------- | -------------- |
| `GET`  | `/api/health` | Liveness check |

> More endpoints (analyses, history) are added in later phases.
