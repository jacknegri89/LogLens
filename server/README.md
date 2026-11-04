# server

The LogLens backend: **Node.js + Express + TypeScript**, with **Prisma + PostgreSQL**
(Neon on Vercel, or any PostgreSQL) for data access.

## Run

```bash
npm install
cp .env.example .env        # fill in your DATABASE_URL and DIRECT_URL
npm run prisma:migrate      # create the tables (safe to run again)
npm run db:seed             # optional: example data, only if the table is empty
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
| `npm run prisma:migrate`  | Create or update the tables (no data is deleted) |
| `npm run prisma:generate` | Regenerate the Prisma client                     |
| `npm run prisma:studio`   | Browse the data in the browser (like phpMyAdmin) |
| `npm run db:seed`         | Add example data, only when the table is empty   |
| `npm test`                | Run the unit tests once                          |
| `npm run test:watch`      | Run tests in watch mode                          |

## Database

- **ORM:** Prisma 7, with the PostgreSQL driver adapter. Schema lives in `prisma/schema.prisma`; the CLI settings (direct URL, seed) live in `prisma.config.ts`. The client is generated into `src/generated/prisma` by `npm run prisma:generate` (also run after `npm install`).
- **Provider:** PostgreSQL (Neon free tier works well; Supabase works too).
- **Browse the data:** `npm run prisma:studio` opens a GUI in the browser.
- **Two connection URLs are needed** (see `.env.example`):
  - `DATABASE_URL` — transaction-mode pooler (port 6543, used by the app at runtime)
  - `DIRECT_URL` — session-mode connection (port 5432, used by `prisma db push`)

## AI provider

LogLens analyzes logs through a single `AIProvider` interface with five
interchangeable implementations, selected by the `AI_PROVIDER` env var:

| `AI_PROVIDER` | Engine                                           | Setup                                  |
| ------------- | ------------------------------------------------ | -------------------------------------- |
| `mock`        | Canned plausible report                          | None — works offline (default)         |
| `rules`       | Built-in rules engine                            | None — no network, deterministic       |
| `hybrid`      | Rules first, OpenAI only for logs no rule covers | Set `OPENAI_API_KEY`                   |
| `openai`      | OpenAI Chat Completions                          | Set `OPENAI_API_KEY`                   |
| `ollama`      | Local Ollama model                               | Install Ollama + `ollama pull <model>` |

The flow: `parseLog` trims the log to an excerpt, the provider returns JSON, and
we validate it with Zod before using it. Prompt design lives in
[`../docs/prompts.md`](../docs/prompts.md).

## Structure

```text
src/
├── index.ts                          # entry point: starts the HTTP server
├── vercel.ts                         # entry point on Vercel (no listen())
├── app.ts                            # builds the Express app
├── config/
│   └── env.ts                        # validated env vars (Zod + dotenv)
├── db/
│   └── prisma.ts                     # shared Prisma client (singleton, PostgreSQL adapter)
├── parser/
│   ├── logParser.ts                  # pure function: extract relevant lines
│   └── lineFields.ts                 # time, level, address, hex code, event id of one line
├── ai/
│   ├── AIProvider.ts                 # the provider interface
│   ├── schema.ts                     # Zod schema for the AI report
│   ├── prompt.ts                     # system + user prompts, random boundary per request
│   ├── parseReport.ts                # parse + validate the AI's JSON
│   ├── guardReport.ts                # check the report against the log it came from
│   ├── correlation.ts                # links the events of a log: root cause, effects, shared addresses
│   ├── index.ts                      # factory: pick provider from env
│   └── providers/                    # mock, rules, hybrid, openai, ollama
├── content/
│   └── rules.ts                      # rules engine: known failures and their advice
├── services/
│   ├── analysisService.ts            # parse -> AI -> validated report
│   ├── addCorrelation.ts             # adds the overview, findings and timeline to a model report
│   ├── attemptLimit.ts               # counts the attempts of a visitor and the whole demo
│   ├── retention.ts                  # deletes analyses past the 90-day retention period
│   └── saveAnalysis.ts               # analyses a log and stores the report
├── repositories/
│   └── analysisRepository.ts         # all Analysis database queries
├── schemas/
│   ├── createAnalysis.ts             # body of POST /api/analyses
│   └── feedback.ts                   # body of PUT /api/analyses/:id/feedback
├── types/
│   └── report.ts                     # report types
├── routes/
│   ├── analyses.ts                   # /api/analyses (needs X-Visitor-Id)
│   ├── cron.ts                       # GET /api/cron/retention (Vercel Cron, needs CRON_SECRET)
│   ├── health.ts                     # GET /api/health
│   └── shared.ts                     # GET /api/shared/:token (secret link, read-only)
└── middleware/
    ├── clientAddress.ts              # caller address, trusted behind a proxy only with TRUST_PROXY
    ├── visitor.ts                    # visitor id header and owner check
    ├── errorHandler.ts               # centralized error handling
    └── notFound.ts                   # 404 JSON fallback

prisma/
├── schema.prisma                     # the data model (Analysis)
└── seed.ts                           # example data for local dev
```

Tests (`*.test.ts`) sit next to the file they cover.

## API

| Method   | Path                         | Description                                                      |
| -------- | ---------------------------- | ---------------------------------------------------------------- |
| `GET`    | `/api/health`                | Liveness check                                                   |
| `POST`   | `/api/analyses`              | Analyze a log and save the result                                |
| `GET`    | `/api/analyses`              | History of this visitor (lightweight summaries)                  |
| `DELETE` | `/api/analyses`              | Delete this visitor's history                                    |
| `DELETE` | `/api/analyses/:id`          | Delete one analysis of this visitor                              |
| `GET`    | `/api/analyses/:id`          | A single analysis with its full report                           |
| `PUT`    | `/api/analyses/:id/feedback` | Mark it useful (`true`), not useful (`false`), or clear (`null`) |
| `POST`   | `/api/analyses/:id/share`    | Create the secret read-only link (or return the existing one)    |
| `DELETE` | `/api/analyses/:id/share`    | Revoke the secret link                                           |
| `GET`    | `/api/shared/:token`         | Read-only report behind a secret link, without the raw log       |
| `GET`    | `/api/cron/retention`        | Deletes analyses older than 90 days; called daily by Vercel Cron |

Every `/api/analyses` route needs the `X-Visitor-Id` header, or it answers `400`.
The `/api/shared/:token` route needs no header: the token is the permission.

`GET /api/cron/retention` needs `Authorization: Bearer <CRON_SECRET>`, which Vercel Cron sends
itself (the schedule is in `vercel.json`). Without `CRON_SECRET` it refuses every call. Analyses are also
checked on each `GET` and `POST /api/analyses`, since the hosting only runs the schedule once a day.

`POST /api/analyses` body:

```json
{ "rawLog": "ERROR ...", "source": "paste", "fileName": "app.log" }
```

Only `rawLog` is required; `source` (`paste` | `upload`) and `fileName` are
optional.
