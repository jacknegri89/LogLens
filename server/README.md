# server

The LogLens backend: **Node.js + Express + TypeScript**, with **Prisma** (SQLite)
for data access.

## Run

```bash
npm install
cp .env.example .env        # DATABASE_URL is preset for SQLite
npm run prisma:migrate      # create the database + seed example data
npm run dev                 # http://localhost:3001 with auto-reload
```

Check it's alive:

```bash
curl http://localhost:3001/api/health
# { "status": "ok", "service": "loglens-server", "timestamp": "..." }
```

## Scripts

| Script                    | What it does                                     |
| ------------------------- | ------------------------------------------------ |
| `npm run dev`             | Start with auto-reload (tsx)                     |
| `npm run build`           | Compile to `dist/` (tsup)                        |
| `npm start`               | Run the compiled server from `dist/`             |
| `npm run typecheck`       | Type-check the project without emitting          |
| `npm run prisma:migrate`  | Create/apply migrations (dev) and run the seed   |
| `npm run prisma:generate` | Regenerate the Prisma client                     |
| `npm run prisma:studio`   | Browse the data in the browser (like phpMyAdmin) |
| `npm run db:seed`         | Re-run the seed script                           |

## Database

- **ORM:** Prisma. Schema lives in `prisma/schema.prisma`, migrations in
  `prisma/migrations/`.
- **Local DB:** a SQLite file at `prisma/dev.db` (git-ignored).
- **Browse the data:** `npm run prisma:studio` opens a GUI in the browser.
- **Move to PostgreSQL/Supabase later:** change the `provider` in
  `prisma/schema.prisma` and the `DATABASE_URL` in `.env` — no code changes.

## Structure

```text
src/
├── index.ts                          # entry point: starts the HTTP server
├── app.ts                            # builds the Express app
├── config/
│   └── env.ts                        # validated env vars (Zod + dotenv)
├── db/
│   └── prisma.ts                     # shared Prisma client (singleton)
├── repositories/
│   └── analysisRepository.ts         # all Analysis database queries
├── types/
│   └── report.ts                     # report types
├── routes/
│   └── health.ts                     # GET /api/health
└── middleware/
    ├── errorHandler.ts               # centralized error handling
    └── notFound.ts                   # 404 JSON fallback

prisma/
├── schema.prisma                     # the data model (Analysis)
├── seed.ts                           # example data for local dev
└── migrations/                       # generated migration history
```

## API

| Method | Path          | Description    |
| ------ | ------------- | -------------- |
| `GET`  | `/api/health` | Liveness check |

> Analysis endpoints (create, history, detail) are added in later phases.
