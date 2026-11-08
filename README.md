<div align="center">

<img src="client/public/favicon.svg" width="72" height="72" alt="LogLens logo: a magnifying glass over a log line" />

# LogLens

**Find the line that broke.**

Paste a log or a stack trace. LogLens marks the failing lines, rates how serious the problem is,
explains the probable causes and drafts the GitHub issue, ready to copy.

[**Live demo**](https://loglens-demo.vercel.app) ·
[Italiano](./README.it.md) ·
[Architecture](./docs/architecture.md) ·
[Changelog](./docs/changelog.md)

[![CI](https://github.com/jacknegri89/LogLens/actions/workflows/ci.yml/badge.svg)](https://github.com/jacknegri89/LogLens/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)

<img src="docs/screenshots/analyze.jpg" alt="The LogLens home page: a magnifying glass over a printout of log lines, with the failing lines highlighted" width="860" />

</div>

## Contents

- [What it does](#what-it-does)
- [See it](#see-it)
- [How it works](#how-it-works)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [API](#api)
- [Project structure](#project-structure)
- [Quality checks](#quality-checks)
- [Deploy on Vercel](#deploy-on-vercel)
- [Security and privacy](#security-and-privacy)
- [Status and limits](#status-and-limits)
- [Documentation](#documentation)
- [License](#license)

## What it does

LogLens turns a wall of log text into an answer you can act on.

**Analysis**

- Paste a log or stack trace, or drop a `.txt` / `.log` file. The format is detected on its own: syslog, JSON lines, Node.js errors, Python tracebacks, Java stack traces, Docker and Kubernetes, PostgreSQL, nginx and Apache access logs, Windows events.
- Routine noise (health checks, probes, static assets) is filtered out before analysis, so real failures stand out.
- Every problem gets a **severity** (informational to critical) and a **category**, probable **causes** and **debug steps**.
- Related events are linked: root cause first, then what it set off, in time order. Repeated failed logins from one address followed by a success are flagged as a possible brute-force break-in.
- A **GitHub issue** is drafted for you, formatted and ready to copy.
- A built-in **rules engine** (50+ rules) works with no API key and no network. **OpenAI** can take over for logs no rule covers (`hybrid`), or for everything. **Ollama** runs a local model for free.
- The page and the reports speak **English and Italian**.

**Keep and share**

- Each analysis is saved in a history that only its owner can see, and kept for 90 days. A copy stays in the browser, so the history still opens when the server is down.
- Share a report with a secret, read-only link. The original log is never included, and the link can be revoked at any time.
- Mark a report useful or not useful.

**Workbench**: a set of tools that work on a log without leaving your browser.

- **Explorer** with a small query language (`level:ERROR service:pay* latency:>200 -healthcheck`), a virtual list that stays smooth on very large logs, and `.gz`, `.zip` and `.tar` archives opened locally.
- **Clusters** that group similar lines, **Traces** that follow one request across services.
- **Lab**: a regex tester that cannot freeze the page, a log diff, a source-map reader and a live tail.
- **Security**: a scanner for suspicious patterns and a scrubber that hides sensitive data.
- **Insights**: risk score, flame graph and a map of the services involved.
- **Export** as a GitHub issue, a Slack message, a PagerDuty event, a post-mortem or JSON, plus permalinks. A command palette (`Ctrl K`) reaches everything.

## See it

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/report.jpg" alt="A report: the failure written on an index card with a SEVERITY HIGH stamp, then the evidence board" /></td>
    <td width="50%"><img src="docs/screenshots/workbench.jpg" alt="The Workbench Explorer: a loaded log with a query bar and a list of parsed lines" /></td>
  </tr>
  <tr>
    <td align="center"><sub><b>The report</b>: what failed, how serious it is, and the evidence behind it.</sub></td>
    <td align="center"><sub><b>The Workbench</b>: search, group and inspect a log in the browser.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/history.jpg" alt="The history page: a drawer of saved analyses" /></td>
    <td width="50%" align="center"><img src="docs/screenshots/mobile.jpg" alt="The home page on a phone" width="260" /></td>
  </tr>
  <tr>
    <td align="center"><sub><b>History</b>: every analysis of the last 90 days, only yours.</sub></td>
    <td align="center"><sub><b>On a phone</b>: the same pages, laid out for a small screen.</sub></td>
  </tr>
</table>

> Screenshots come from the live demo, which runs with `AI_PROVIDER=hybrid`: the built-in rules answer first, and OpenAI only handles logs no rule covers.

## How it works

```mermaid
flowchart LR
    U[You] -->|paste or upload| C[React client]
    C -->|POST /api/analyses| A[Express API]
    A -->|limits and validation| L{Allowed?}
    L -->|no| E[429 / 400]
    L -->|yes| P[Parser and noise filter]
    P -->|relevant lines| R[Rules engine]
    R -->|no rule matches| M[OpenAI or Ollama]
    R -->|report| G[Guard]
    M -->|report| G
    G -->|checked against the log| K[Correlation]
    K -->|save| D[(PostgreSQL)]
    K -->|report| C
```

1. The **parser** reads the log, detects its format and keeps the relevant lines. The **noise filter** drops routine traffic unless it carries an error.
2. The **rules engine** matches known failures and writes the report. In `hybrid` mode a model is asked only when no rule applies.
3. The **guard** checks any model output against the log: severity cannot fall below the evidence, evidence lines must be real lines, links and HTML are removed, risky commands are dropped.
4. **Correlation** links the events (cause, effects, shared addresses) and builds the timeline.
5. The report is validated with Zod, saved with Prisma and returned.

The prompt, its four phases and its protection against prompt injection are described in [`docs/prompts.md`](./docs/prompts.md). The full design is in [`docs/architecture.md`](./docs/architecture.md).

## Quick start

**You need:** Node.js 20 or newer and a PostgreSQL database (free on [Neon](https://neon.tech) or [Supabase](https://supabase.com)). An OpenAI key or [Ollama](https://ollama.com) is optional: the rules engine needs neither.

```bash
git clone https://github.com/jacknegri89/LogLens.git
cd LogLens
```

**Backend** (http://localhost:3001)

```bash
cd server
npm install                 # also generates the Prisma client
cp .env.example .env        # then fill in DATABASE_URL and DIRECT_URL
npm run prisma:migrate      # creates the tables: review the changes and back up existing data first
npm run db:seed             # optional: example analyses, only if the table is empty
npm run dev                 # starts with auto-reload
```

```bash
curl http://localhost:3001/api/health
# { "status": "ok", "service": "loglens-server", "timestamp": "..." }
```

**Frontend** (http://localhost:5173)

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173. The client expects the API on port 3001.

Try it with the logs in [`examples/`](./examples/): a Node.js unhandled exception, a Docker Compose startup failure and database connection errors.

## Configuration

Everything is configured with environment variables, validated at startup (a wrong value stops the server with a clear message). Locally they live in `server/.env`; on Vercel, in the project settings. Secrets never go in the code or in git.

| Variable                    | Default                   | What it does                                                                                 |
| --------------------------- | ------------------------- | -------------------------------------------------------------------------------------------- |
| `DATABASE_URL`              | (required)                | Pooled PostgreSQL connection, used by the app                                                |
| `DIRECT_URL`                | (required for migrations) | Direct connection, used by the Prisma CLI                                                    |
| `AI_PROVIDER`               | `mock`                    | `mock`, `rules`, `hybrid`, `openai` or `ollama`                                              |
| `OPENAI_API_KEY`            |                           | Needed for `openai` and `hybrid`                                                             |
| `OPENAI_MODEL`              | `gpt-4o-mini`             | The OpenAI model                                                                             |
| `OLLAMA_BASE_URL`           | `http://localhost:11434`  | Where Ollama listens                                                                         |
| `OLLAMA_MODEL`              | `llama3.2`                | The Ollama model                                                                             |
| `RATE_LIMIT_PER_HOUR`       | `5`                       | Analysis attempts per address per hour, failed ones included (`0` = no limit)                |
| `GLOBAL_LIMIT_PER_HOUR`     | `100`                     | Analysis attempts for everyone per hour (`0` = no limit)                                     |
| `API_RATE_LIMIT_PER_MINUTE` | `120`                     | Requests per minute from one address to the whole API, counted per instance (`0` = no limit) |
| `TRUST_PROXY`               | `false`                   | `true` behind a proxy such as Vercel, so limits count real visitors                          |
| `VISITOR_SALT`              | `loglens`                 | A long random text that salts the hash of visitor addresses. **Change it in production**     |
| `CRON_SECRET`               |                           | 16+ characters; Vercel Cron sends it to clean up analyses older than 90 days                 |
| `CORS_ORIGIN`               | `*`                       | Allowed origin. In production leave it empty: client and API share one domain                |

## API

| Method   | Path                         | What it does                                                     |
| -------- | ---------------------------- | ---------------------------------------------------------------- |
| `POST`   | `/api/analyses`              | Analyze a log and save the report                                |
| `GET`    | `/api/analyses`              | The history of this visitor                                      |
| `GET`    | `/api/analyses/:id`          | One analysis with its full report                                |
| `DELETE` | `/api/analyses/:id`          | Delete one analysis (`DELETE /api/analyses` deletes them all)    |
| `PUT`    | `/api/analyses/:id/feedback` | Mark useful, not useful, or clear                                |
| `POST`   | `/api/analyses/:id/share`    | Create the secret read-only link (`DELETE` revokes it)           |
| `GET`    | `/api/shared/:token`         | The shared report, without the raw log                           |
| `GET`    | `/api/cron/retention`        | Delete analyses older than 90 days (Vercel Cron, needs a secret) |
| `GET`    | `/api/health`                | Liveness check                                                   |

`/api/analyses` routes need an `X-Visitor-Id` header: a random id the browser keeps, not a login. Details, bodies and the code map are in [`server/README.md`](./server/README.md).

## Project structure

```text
LogLens/
├── client/               # React + TypeScript + Vite + Tailwind
│   ├── src/pages/        # analyze, history, report, shared link, privacy
│   ├── src/content/      # every visible text, in English and Italian
│   ├── src/workbench/    # the Workbench, one folder per tab
│   └── e2e/              # Playwright end-to-end tests
├── server/               # Node.js + Express + TypeScript
│   ├── src/routes/       # the /api routes
│   ├── src/ai/           # parser output → rules engine → OpenAI / Ollama → guard
│   ├── src/services/     # limits, retention, saving analyses
│   └── prisma/           # schema and seed data
├── docs/                 # architecture, prompts, decisions, status, changelog
├── examples/             # sample logs to try
├── vercel.json           # build command and the daily cron
└── .github/workflows/    # CI
```

## Quality checks

```bash
npm run format:check                 # Prettier, from the repository root
npm run typecheck --prefix server
npm run typecheck --prefix client
npm run lint --prefix client
npm test --prefix server             # unit tests
npm test --prefix client             # unit tests
npm run test:e2e --prefix client     # Playwright, phone viewport
```

The same checks, plus both builds, run on every push in [GitHub Actions](./.github/workflows/ci.yml). Dependencies are audited with `npm audit` and kept at zero known vulnerabilities.

## Deploy on Vercel

The whole app (React client and Express API) runs as one Vercel project, with PostgreSQL on Neon through the Vercel integration. Both have a free tier.

1. **Import the repository** on [vercel.com](https://vercel.com) → _Add New → Project_. Leave the build settings alone: `vercel.json` has them.
2. **Add the database**: in _Storage_ add **Neon**. Vercel creates `DATABASE_URL` and `DIRECT_URL`.
3. **Add the environment variables** from [Configuration](#configuration). On Vercel set at least `AI_PROVIDER`, `TRUST_PROXY=true`, a long random `VISITOR_SALT`, and `CRON_SECRET`. Add `OPENAI_API_KEY` for `openai` or `hybrid`.
4. **Create the tables once**, from your computer, with the Neon URLs in `server/.env`: `cd server && npm run prisma:migrate`.
5. **Deploy**: push to the connected branch, or run `npm run build:vercel` and deploy `.vercel/output`.

Vercel Cron calls `/api/cron/retention` every day at 03:00 UTC (see `vercel.json`).

If you run your own instance, update the contact, the database region and the providers in [`client/src/content/privacy.ts`](./client/src/content/privacy.ts), and keep its 90 days equal to `ANALYSIS_RETENTION_DAYS` in `server/src/services/retention.ts`.

## Security and privacy

- **No cookies.** The browser's local storage keeps only your choices (language, anonymize, theme), a random visitor id and a local copy of your history. The [privacy page](https://loglens-demo.vercel.app/privacy) lists what is handled, why and for how long.
- **Anonymize before sending.** One switch replaces IP addresses, e-mails and secrets in your browser, before anything leaves it.
- **Data limits.** Analyses are deleted after 90 days, or earlier by you. Network addresses are stored only as salted hashes, and the attempts that use them are removed after an hour.
- **Share links** carry an unguessable token, never reach the logs, are sent with `Referrer-Policy: no-referrer`, are not indexed, and can be revoked.
- **Abuse limits.** Per-address and global hourly limits on analyses, and a per-minute limit on the whole API.
- **Hardened responses.** A strict Content-Security-Policy, `X-Frame-Options`, `nosniff`, HSTS and a locked-down Permissions-Policy on every response.
- **Model output is untrusted.** It is validated, checked against the log it came from, stripped of links and HTML, and the prompt uses a random delimiter against prompt injection.
- **Cleanup endpoint.** `GET /api/cron/retention` refuses any call without the `CRON_SECRET`, compared in constant time.

Even so, do not paste real secrets into a public instance.

## Status and limits

- The **Fix** and **Ask** tabs of the Workbench show "not available yet". Their code is in the repository but unreachable until it is reviewed.
- The per-minute API limit is counted in each server instance's memory: it stops bursts, but it is not a global quota. The hourly analysis limits are in the database and are shared.
- The daily cleanup runs on Vercel's schedule; analyses past 90 days are also removed on the next history read or new analysis.

See [`docs/stato.md`](./docs/stato.md) for the current status and [`docs/decisions.md`](./docs/decisions.md) for why things are the way they are.

## Documentation

| File                                             | What is in it                                   |
| ------------------------------------------------ | ----------------------------------------------- |
| [`docs/architecture.md`](./docs/architecture.md) | The flow, the components and the design choices |
| [`docs/prompts.md`](./docs/prompts.md)           | The prompt, its phases and the JSON contract    |
| [`docs/decisions.md`](./docs/decisions.md)       | Decisions, with the reason and the alternatives |
| [`docs/changelog.md`](./docs/changelog.md)       | What changed and when                           |
| [`docs/stato.md`](./docs/stato.md)               | Current status and what is left                 |
| [`docs/checklist.md`](./docs/checklist.md)       | The latest end-of-task checks, PASS or FAIL     |
| [`server/README.md`](./server/README.md)         | The backend: scripts, structure and API details |

Issues and pull requests are welcome. Run the [quality checks](#quality-checks) first.

## License

Released under the [MIT License](./LICENSE) © 2026 Giacomo Negri.
