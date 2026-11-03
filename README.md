<div align="center">

# LogLens

**Paste a log or a stack trace — get an AI-powered analysis and a ready-to-paste bug report.**

LogLens reads your logs, finds the real error, classifies its severity and
category, explains the likely causes, suggests debugging steps, and generates a
GitHub Issue you can copy in one click.

[![CI](https://github.com/jacknegri89/LogLens/actions/workflows/ci.yml/badge.svg)](https://github.com/jacknegri89/LogLens/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)

</div>

**Live demo:** https://loglens-demo.vercel.app

---

## Features

- **Paste or upload** — paste a log/stack trace or drop a `.txt` / `.log` file
- **AI analysis** — the relevant lines are sent to an AI model that returns a structured report
- **Severity & category** — every issue is classified (informational / low / medium / high / critical) and tagged
- **Actionable report** — main problem, key log lines, probable causes, debug steps
- **Copy-ready GitHub Issue** — one click to copy a formatted bug report
- **History** — every analysis is saved and revisitable; each visitor sees only their own (kept in their browser)
- **Built-in AI** — a rules engine runs with no API key; **OpenAI** and a **free local Ollama** model can be switched on with one variable
- **Demo limits** — optional per-visitor and global hourly limits for public instances

## Tech stack

| Area     | Technology                        |
| -------- | --------------------------------- |
| Frontend | React, TypeScript, Vite, Tailwind |
| Backend  | Node.js, Express, TypeScript      |
| Database | PostgreSQL (Prisma), e.g. Neon    |
| AI       | Rules engine, OpenAI or Ollama    |
| Tests    | Vitest                            |
| CI/CD    | GitHub Actions                    |

## Architecture

The flow in one line: **client → API → parser → AI provider → database → report**.

Full diagram and design decisions in [`docs/architecture.md`](./docs/architecture.md).
Prompt design lives in [`docs/prompts.md`](./docs/prompts.md).

## Getting started

### Prerequisites

- Node.js `>= 20`
- A PostgreSQL database (free on [Neon](https://neon.tech) or [Supabase](https://supabase.com))
- Optional: an OpenAI API key or a local [Ollama](https://ollama.com) install. The rules engine needs neither.

### Setup

```bash
git clone https://github.com/jacknegri89/LogLens.git
cd LogLens
```

### Run the backend

```bash
cd server
npm install
cp .env.example .env
# Edit .env: paste your PostgreSQL DATABASE_URL and DIRECT_URL
npm run prisma:migrate      # create the tables (safe to run again)
npm run db:seed             # optional: add example analyses to an empty database
npm run dev                 # starts http://localhost:3001 with auto-reload
```

Check it's alive:

```bash
curl http://localhost:3001/api/health
# { "status": "ok", "service": "loglens-server", "timestamp": "..." }
```

### Run the frontend

```bash
cd client
npm install
npm run dev                 # starts http://localhost:5173
```

Open the app at `http://localhost:5173`. The frontend expects the backend running at `http://localhost:3001`.

## Project structure

```text
LogLens/
├── client/     # React + TypeScript + Vite + Tailwind CSS frontend
├── server/     # Node.js + Express + TypeScript backend
│   └── prisma/ # schema.prisma, migrations, seed
├── docs/       # architecture notes, AI prompt design
├── examples/   # sample log files to try the app with
└── .github/    # CI workflow
```

## Screenshots

> Captured on the live demo, which uses `AI_PROVIDER=hybrid`: the built-in rules answer first, and OpenAI only handles logs that no rule covers.

| Paste a log or upload a file                  | Report with severity, key lines, causes and steps |
| --------------------------------------------- | ------------------------------------------------- |
| ![Analyze page](docs/screenshots/analyze.jpg) | ![Report](docs/screenshots/report.jpg)            |

![History of analyses](docs/screenshots/history.jpg)

## Deploy on Vercel

The whole app (React client + Express API) runs as one Vercel project, with
PostgreSQL on Neon through the Vercel integration. Both have a free tier.

1. **Import the repo** on [vercel.com](https://vercel.com) → _Add New → Project_.
   Leave the build settings alone: `vercel.json` already contains them.
2. **Add the database.** In the project, open _Storage_ (or _Integrations_) and add
   **Neon**. Vercel creates `DATABASE_URL` and `DIRECT_URL` for you.
3. **Environment variables** (Project → Settings → Environment Variables):

   | Variable                | Value                                                                                                      |
   | ----------------------- | ---------------------------------------------------------------------------------------------------------- |
   | `AI_PROVIDER`           | `rules` (no key needed), `hybrid` (rules first, OpenAI only for logs no rule covers), `openai` or `ollama` |
   | `OPENAI_API_KEY`        | your key, only when `AI_PROVIDER=openai` or `hybrid`                                                       |
   | `RATE_LIMIT_PER_HOUR`   | analysis attempts per client address per hour, failed ones included (default `5`, `0` = no limit)          |
   | `GLOBAL_LIMIT_PER_HOUR` | analysis attempts for everyone per hour (default `100`, `0` = no limit)                                    |
   | `TRUST_PROXY`           | `true` on Vercel, so the limit counts real visitors, not the proxy                                         |
   | `VISITOR_SALT`          | any long random text, used to hash visitor addresses                                                       |
   | `INGEST_TOKEN`          | optional secret (16+ characters) that opens `POST /api/ingest` for other applications                      |
   | `CORS_ORIGIN`           | leave empty: client and API share the same domain                                                          |

4. **Create the tables once**, from your computer, with the Neon URLs in `server/.env`:

   ```bash
   cd server
   npm run prisma:migrate
   ```

5. **Deploy.** Push to the branch connected to Vercel, or run `npm run build:vercel`
   and deploy `.vercel/output` (see `server/scripts/build-vercel.mjs`).

> Privacy: each visitor's history is tied to a random id kept in their browser, and
> visitor addresses are stored only as salted hashes. Still, do not paste real
> secrets into a public instance.

## Examples

Try LogLens with the sample logs in [`examples/`](./examples/):

- [`node-error.log`](./examples/node-error.log) — a Node.js unhandled exception
- [`docker-error.log`](./examples/docker-error.log) — a Docker Compose startup failure
- [`database-error.log`](./examples/database-error.log) — database connection & query errors

## Status

Complete: log parsing, AI analysis (built-in rules engine, OpenAI or Ollama), REST API, React frontend, per-visitor analysis history (with delete), rate limits, unit tests, an end-to-end test for the log editor, and CI on GitHub Actions.

## License

Released under the [MIT License](./LICENSE) © 2026 Giacomo Negri.
