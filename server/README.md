# server

The LogLens backend: **Node.js + Express + TypeScript**, with **Prisma + PostgreSQL**
(Supabase) for data access.

## Run

```bash
npm install
cp .env.example .env        # fill in your DATABASE_URL and DIRECT_URL
npm run prisma:migrate      # push schema to the database + seed example data
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
| `npm run prisma:migrate`  | Push schema to the database and run the seed     |
| `npm run prisma:generate` | Regenerate the Prisma client                     |
| `npm run prisma:studio`   | Browse the data in the browser (like phpMyAdmin) |
| `npm run db:seed`         | Re-run the seed script                           |
| `npm test`                | Run the unit tests once                          |
| `npm run test:watch`      | Run tests in watch mode                          |

## Database

- **ORM:** Prisma. Schema lives in `prisma/schema.prisma`.
- **Provider:** PostgreSQL (Supabase free tier works perfectly).
- **Browse the data:** `npm run prisma:studio` opens a GUI in the browser.
- **Two connection URLs are needed** (see `.env.example`):
  - `DATABASE_URL` — transaction-mode pooler (port 6543, used by the app at runtime)
  - `DIRECT_URL` — session-mode connection (port 5432, used by `prisma db push`)

## AI provider

LogLens analyzes logs through a single `AIProvider` interface with three
interchangeable implementations, selected by the `AI_PROVIDER` env var:

| `AI_PROVIDER` | Engine                  | Setup                                  |
| ------------- | ----------------------- | -------------------------------------- |
| `mock`        | Canned plausible report | None — works offline (default)         |
| `openai`      | OpenAI Chat Completions | Set `OPENAI_API_KEY`                   |
| `ollama`      | Local Ollama model      | Install Ollama + `ollama pull <model>` |

The flow: `parseLog` trims the log to an excerpt, the provider returns JSON, and
we validate it with Zod before using it. Prompt design lives in
[`../docs/prompts.md`](../docs/prompts.md).

## Structure

```text
src/
├── index.ts                          # entry point: starts the HTTP server
├── app.ts                            # builds the Express app
├── config/
│   └── env.ts                        # validated env vars (Zod + dotenv)
├── db/
│   └── prisma.ts                     # shared Prisma client (singleton)
├── parser/
│   └── logParser.ts                  # pure function: extract relevant lines
├── ai/
│   ├── AIProvider.ts                 # the provider interface
│   ├── schema.ts                     # Zod schema for the AI report
│   ├── prompt.ts                     # system + user prompts
│   ├── parseReport.ts                # parse + validate the AI's JSON
│   ├── index.ts                      # factory: pick provider from env
│   └── providers/                    # mock, openai, ollama
├── services/
│   └── analysisService.ts            # parse -> AI -> validated report
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
└── seed.ts                           # example data for local dev
```

## API

| Method | Path                | Description                            |
| ------ | ------------------- | -------------------------------------- |
| `GET`  | `/api/health`       | Liveness check                         |
| `POST` | `/api/analyses`     | Analyze a log and save the result      |
| `GET`  | `/api/analyses`     | History (lightweight summaries)        |
| `GET`  | `/api/analyses/:id` | A single analysis with its full report |

`POST /api/analyses` body:

```json
{ "rawLog": "ERROR ...", "source": "paste", "fileName": "app.log" }
```

Only `rawLog` is required; `source` (`paste` | `upload`) and `fileName` are
optional.
