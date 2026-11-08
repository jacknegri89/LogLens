<div align="center">

# LogLens

**Incolla un log o uno stack trace: ottieni un'analisi con intelligenza artificiale e una issue pronta da copiare.**

LogLens legge i log, trova l'errore vero, ne valuta la gravità e la categoria, spiega le cause
probabili, suggerisce i passi per risolverlo e prepara una issue GitHub da copiare con un clic.

[![CI](https://github.com/jacknegri89/LogLens/actions/workflows/ci.yml/badge.svg)](https://github.com/jacknegri89/LogLens/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)

</div>

**Demo online:** https://loglens-demo.vercel.app

---

## Cosa fa

- **Incolla o carica** un log o uno stack trace, oppure trascina un file `.txt` / `.log`.
- **Analisi AI:** le righe rilevanti vanno a un motore che restituisce un report strutturato.
- **Gravità e categoria:** ogni problema è classificato (informativo, bassa, media, alta, critica).
- **Report utile:** problema principale, righe chiave, cause probabili, passi per il debug.
- **Issue GitHub pronta:** un clic per copiare il testo già formattato.
- **Cronologia:** ogni analisi resta consultabile per 90 giorni; ogni visitatore vede solo le proprie.
- **Link di condivisione** in sola lettura, revocabile, senza il log originale.
- **Workbench:** strumenti per esplorare un log (cerca, raggruppa, tracce, laboratorio, sicurezza, metriche, esportazione). Le schede Correzione e Chiedi non sono ancora disponibili.
- **Motore integrato:** funziona senza chiavi; **OpenAI** e **Ollama** (gratuito, in locale) si attivano con una variabile.
- **Limiti per la demo pubblica:** per visitatore, per ora, e per minuto su tutte le API.

## Tecnologie

| Area     | Tecnologia                        |
| -------- | --------------------------------- |
| Frontend | React, TypeScript, Vite, Tailwind |
| Backend  | Node.js, Express, TypeScript      |
| Database | PostgreSQL con Prisma 7 (Neon)    |
| AI       | Regole, OpenAI oppure Ollama      |
| Test     | Vitest, Playwright                |
| CI/CD    | GitHub Actions, Vercel            |

## Come funziona

In una riga: **client → API → parser → motore AI → database → report**.

Schema completo e scelte di progetto in [`docs/architecture.md`](./docs/architecture.md).
Il prompt è descritto in [`docs/prompts.md`](./docs/prompts.md).

## Avvio in locale

### Prerequisiti

- Node.js `>= 20`
- Un database PostgreSQL (gratuito su [Neon](https://neon.tech) o [Supabase](https://supabase.com))
- Facoltativo: una chiave OpenAI o [Ollama](https://ollama.com) installato. Il motore a regole non richiede nulla.

### Preparazione

```bash
git clone https://github.com/jacknegri89/LogLens.git
cd LogLens
```

### Backend

```bash
cd server
npm install                 # genera anche il client Prisma
cp .env.example .env
# Apri .env e inserisci DATABASE_URL e DIRECT_URL del tuo database
npm run prisma:migrate      # crea le tabelle: controlla le modifiche e fai un backup se ci sono dati
npm run db:seed             # facoltativo: analisi di esempio, solo se la tabella è vuota
npm run dev                 # avvia http://localhost:3001 con ricarica automatica
```

Controlla che risponda:

```bash
curl http://localhost:3001/api/health
# { "status": "ok", "service": "loglens-server", "timestamp": "..." }
```

### Frontend

```bash
cd client
npm install
npm run dev                 # avvia http://localhost:5173
```

Apri `http://localhost:5173`. Il frontend si aspetta il backend su `http://localhost:3001`.

### Controlli

```bash
npm run format:check        # dalla radice: formattazione con Prettier
npm run typecheck --prefix server
npm run typecheck --prefix client
npm run lint --prefix client
npm test --prefix server
npm test --prefix client
npm run test:e2e --prefix client
```

## File principali

```text
LogLens/
├── client/             # frontend React + TypeScript + Vite + Tailwind
│   ├── src/pages/      # le pagine: analisi, cronologia, dettaglio, link condiviso, privacy
│   ├── src/content/    # tutti i testi visibili, in italiano e in inglese
│   └── src/workbench/  # il Workbench, con una cartella per ogni scheda
├── server/             # backend Node.js + Express + TypeScript
│   ├── src/routes/     # le rotte /api (analisi, link condivisi, cron, health)
│   ├── src/ai/         # parser dei log, motore a regole, provider OpenAI e Ollama
│   ├── src/services/   # limiti, pulizia dei dati scaduti, salvataggio delle analisi
│   └── prisma/         # schema del database e dati di esempio
├── docs/               # architettura, prompt, decisioni, stato, changelog
├── examples/           # log di esempio da provare
├── vercel.json         # comandi di build e pianificazione del cron
└── .github/            # workflow della CI
```

Le configurazioni si cambiano in `server/.env` (database, motore AI, limiti, segreti). Il file
`server/.env.example` elenca le variabili senza valori. I segreti non vanno mai nel codice né in git.

## Schermate

> Catturate sulla demo online, che usa `AI_PROVIDER=hybrid`: rispondono prima le regole integrate, e OpenAI interviene solo sui log che nessuna regola copre.

| Incolla un log o carica un file                    | Report con gravità, righe chiave, cause e passi |
| -------------------------------------------------- | ----------------------------------------------- |
| ![Pagina di analisi](docs/screenshots/analyze.jpg) | ![Report](docs/screenshots/report.jpg)          |

![Cronologia delle analisi](docs/screenshots/history.jpg)

## Pubblicazione su Vercel

L'intera applicazione (client React e API Express) gira come un unico progetto Vercel, con
PostgreSQL su Neon tramite l'integrazione di Vercel. Entrambi hanno un piano gratuito.

1. **Importa il repository** su [vercel.com](https://vercel.com) → _Add New → Project_.
   Non toccare le impostazioni di build: le contiene già `vercel.json`.
2. **Aggiungi il database.** Nel progetto apri _Storage_ (o _Integrations_) e aggiungi
   **Neon**. Vercel crea da solo `DATABASE_URL` e `DIRECT_URL`.
3. **Variabili d'ambiente** (Project → Settings → Environment Variables):

   | Variabile                   | Valore                                                                                                          |
   | --------------------------- | --------------------------------------------------------------------------------------------------------------- |
   | `AI_PROVIDER`               | `rules` (nessuna chiave), `hybrid` (prima le regole, OpenAI solo per i log sconosciuti), `openai` o `ollama`    |
   | `OPENAI_API_KEY`            | la tua chiave, solo con `AI_PROVIDER=openai` o `hybrid`                                                         |
   | `RATE_LIMIT_PER_HOUR`       | tentativi di analisi per indirizzo all'ora, anche quelli falliti (predefinito `5`, `0` = nessun limite)         |
   | `GLOBAL_LIMIT_PER_HOUR`     | tentativi di analisi di tutti all'ora (predefinito `100`, `0` = nessun limite)                                  |
   | `API_RATE_LIMIT_PER_MINUTE` | richieste al minuto da un indirizzo a tutta l'API, contate per istanza (predefinito `120`, `0` = nessun limite) |
   | `TRUST_PROXY`               | `true` su Vercel, così il limite conta i visitatori veri e non il proxy                                         |
   | `VISITOR_SALT`              | un testo casuale e lungo, usato per l'hash degli indirizzi dei visitatori                                       |
   | `CRON_SECRET`               | un testo casuale (almeno 16 caratteri) che Vercel Cron invia per cancellare le analisi oltre i 90 giorni        |
   | `CORS_ORIGIN`               | lascialo vuoto: client e API usano lo stesso dominio                                                            |

4. **Crea le tabelle una volta**, dal tuo computer, con gli indirizzi di Neon in `server/.env`:

   ```bash
   cd server
   npm run prisma:migrate
   ```

5. **Pubblica.** Fai il push sul ramo collegato a Vercel, oppure esegui `npm run build:vercel`
   e pubblica `.vercel/output` (vedi `server/scripts/build-vercel.mjs`).

> Privacy: la cronologia di ogni visitatore è legata a un identificativo casuale salvato nel suo
> browser, e gli indirizzi dei visitatori sono conservati solo come hash con sale. Non incollare
> comunque segreti veri in un'istanza pubblica.
>
> La pagina privacy e cookie (`/privacy`) elenca i dati trattati, i fornitori e i tempi di
> conservazione. Se pubblichi una tua istanza, cambia contatto, regione del database e fornitori in
> [`client/src/content/privacy.ts`](./client/src/content/privacy.ts), e tieni i 90 giorni della
> pagina uguali a `ANALYSIS_RETENTION_DAYS` in `server/src/services/retention.ts`.

## Esempi

Prova LogLens con i log di esempio in [`examples/`](./examples/):

- [`node-error.log`](./examples/node-error.log): un'eccezione non gestita di Node.js
- [`docker-error.log`](./examples/docker-error.log): un avvio fallito di Docker Compose
- [`database-error.log`](./examples/database-error.log): errori di connessione e di query al database

## Stato

Completo: lettura dei log, analisi AI (motore a regole, OpenAI o Ollama), API REST, frontend React, Workbench (le schede Correzione e Chiedi sono ancora da attivare), cronologia per visitatore con cancellazione, link condivisi in sola lettura, limiti di richieste, pagina privacy e cookie, cancellazione automatica delle analisi dopo 90 giorni (Vercel Cron giornaliero), test unitari di server e client, test end-to-end e CI su GitHub Actions.

## Licenza

Rilasciato con [licenza MIT](./LICENSE) © 2026 Giacomo Negri.
