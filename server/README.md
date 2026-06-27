# server

The LogLens backend: **Node.js + Express + TypeScript**, with **Prisma** for
data access and a pluggable **AI provider** (OpenAI or Ollama).

> 🚧 Scaffolded in **Phase 1** of the roadmap. For now this folder is a
> placeholder so the repository structure is complete.

Planned API:

| Method | Path                | Description                                |
| ------ | ------------------- | ------------------------------------------ |
| `GET`  | `/api/health`       | Liveness check                             |
| `POST` | `/api/analyses`     | Analyze a pasted log or uploaded file      |
| `GET`  | `/api/analyses`     | List previous analyses (history)           |
| `GET`  | `/api/analyses/:id` | Get a single analysis with its full report |
