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

---

## Features

- **Paste or upload** — paste a log/stack trace or drop a `.txt` / `.log` file
- **AI analysis** — the relevant lines are sent to an AI model that returns a structured report
- **Severity & category** — every issue is classified (low / medium / high) and tagged
- **Actionable report** — main problem, key log lines, probable causes, debug steps
- **Copy-ready GitHub Issue** — one click to copy a formatted bug report
- **History** — every analysis is saved; revisit it from a detail page
- **Pluggable AI** — works with **OpenAI** or a **free local Ollama** model

## Screenshots

> Coming in Phase 9.

## Tech stack

| Area     | Technology                        |
| -------- | --------------------------------- |
| Frontend | React, TypeScript, Vite, Tailwind |
| Backend  | Node.js, Express, TypeScript      |
| Database | SQLite (Prisma ORM) → PostgreSQL  |
| AI       | OpenAI API **or** Ollama (local)  |
| Tests    | Vitest                            |
| CI/CD    | GitHub Actions                    |

## Architecture

The flow in one line: **client → API → parser → AI provider → database → report**.

Full diagram and design decisions in [`docs/architecture.md`](./docs/architecture.md).
Prompt design lives in [`docs/prompts.md`](./docs/prompts.md).

## Getting started

### Prerequisites

- Node.js `>= 20`
- An OpenAI API key **or** a local [Ollama](https://ollama.com) install

### Setup

```bash
git clone https://github.com/jacknegri89/LogLens.git
cd LogLens
```

### Run the backend

```bash
cd server
npm install
cp .env.example .env        # DATABASE_URL is preset for SQLite
npm run prisma:migrate      # create the SQLite database + seed example data
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

## Examples

Try LogLens with the sample logs in [`examples/`](./examples/):

- [`node-error.log`](./examples/node-error.log) — a Node.js unhandled exception
- [`docker-error.log`](./examples/docker-error.log) — a Docker Compose startup failure
- [`database-error.log`](./examples/database-error.log) — database connection & query errors

## Roadmap

- [x] **Phase 0** — Project structure, CI skeleton, docs & examples
- [x] **Phase 1** — Express + TypeScript backend
- [x] **Phase 2** — Prisma schema & migrations
- [x] **Phase 3** — Log parser
- [x] **Phase 4** — AI analysis service (OpenAI / Ollama)
- [x] **Phase 5** — Analysis API endpoints
- [x] **Phase 6** — React + Tailwind frontend
- [ ] **Phase 7** — Tests (Vitest)
- [ ] **Phase 8** — Full CI/CD
- [ ] **Phase 9** — Screenshots, polish & docs

## License

No open-source license — all rights reserved © 2026 Giacomo Negri.
You're welcome to browse the code; please ask before reusing it.
