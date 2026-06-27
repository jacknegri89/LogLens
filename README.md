<div align="center">

# 🔍 LogLens

**Paste a log or a stack trace — get an AI-powered analysis and a ready-to-paste bug report.**

LogLens reads your logs, finds the real error, classifies its severity and
category, explains the likely causes, suggests debugging steps, and generates a
GitHub Issue you can copy in one click.

[![CI](https://github.com/jacknegri89/LogLens/actions/workflows/ci.yml/badge.svg)](https://github.com/jacknegri89/LogLens/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)

</div>

---

## ✨ Features

- 📋 **Paste or upload** — paste a log/stack trace or drop a `.txt` / `.log` file
- 🧠 **AI analysis** — the relevant lines are sent to an AI model that returns a structured report
- 🚦 **Severity & category** — every issue is classified (low / medium / high) and tagged
- 🧩 **Actionable report** — main problem, key log lines, probable causes, debug steps
- 📝 **Markdown export** — download the report or copy a ready-to-paste **GitHub Issue**
- 🕓 **History** — every analysis is saved; revisit it from a detail page
- 🔌 **Pluggable AI** — works with **OpenAI** or a **free local Ollama** model

## 🖼️ Screenshots

> 🚧 Added in Phase 9 — see [`docs/screenshots/`](./docs/screenshots/).

## 🧰 Tech stack

| Area     | Technology                        |
| -------- | --------------------------------- |
| Frontend | React, TypeScript, Vite, Tailwind |
| Backend  | Node.js, Express, TypeScript      |
| Database | SQLite (Prisma ORM) → PostgreSQL  |
| AI       | OpenAI API **or** Ollama (local)  |
| Tests    | Vitest                            |
| CI/CD    | GitHub Actions                    |

## 🏗️ Architecture

The flow in one line: **client → API → parser → AI provider → database → report**.

Full diagram and design decisions in [`docs/architecture.md`](./docs/architecture.md).
Prompt design lives in [`docs/prompts.md`](./docs/prompts.md).

## 🚀 Getting started

### Prerequisites

- Node.js `>= 20`
- An OpenAI API key **or** a local [Ollama](https://ollama.com) install

### Setup

```bash
# 1. Clone
git clone https://github.com/jacknegri89/LogLens.git
cd LogLens

# 2. Configure environment
cp .env.example .env   # then edit .env with your values

# 3. Install dependencies
npm install
```

> 🚧 Run commands for the client and server are added as those parts are built
> (see the roadmap below). Until then, this section will grow with the project.

## 📁 Project structure

```text
loglens/
├── client/     # React + TS + Tailwind frontend
├── server/     # Express + TS backend (parser, AI provider, routes)
├── prisma/     # schema.prisma + migrations
├── docs/       # architecture, prompt design, screenshots
├── examples/   # sample logs to try the app with
└── .github/    # CI workflow
```

## 🧪 Examples

Try LogLens with the sample logs in [`examples/`](./examples/):

- [`node-error.log`](./examples/node-error.log) — a Node.js unhandled exception
- [`docker-error.log`](./examples/docker-error.log) — a Docker Compose startup failure
- [`database-error.log`](./examples/database-error.log) — database connection & query errors

## 🗺️ Roadmap

- [x] **Phase 0** — Project structure, CI skeleton, docs & examples
- [ ] **Phase 1** — Express + TypeScript backend
- [ ] **Phase 2** — Prisma schema & migrations
- [ ] **Phase 3** — Log parser
- [ ] **Phase 4** — AI analysis service (OpenAI / Ollama)
- [ ] **Phase 5** — Analysis API endpoints
- [ ] **Phase 6** — React + Tailwind frontend
- [ ] **Phase 7** — Tests (Vitest)
- [ ] **Phase 8** — Full CI/CD
- [ ] **Phase 9** — Screenshots, polish & docs

## 📄 License

[MIT](./LICENSE) © 2026 Giacomo Negri
