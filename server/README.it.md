# server

[English](./README.md) · [Torna al README del progetto](../README.it.md)

Il backend di LogLens: **Node.js + Express + TypeScript**, con **Prisma 7 + PostgreSQL**
(Neon su Vercel, oppure un qualsiasi PostgreSQL) per l'accesso ai dati.

## Avvio

```bash
npm install                 # genera anche il client Prisma
cp .env.example .env        # inserisci DATABASE_URL e DIRECT_URL
npm run prisma:migrate      # crea le tabelle: controlla le modifiche e fai un backup se ci sono dati
npm run db:seed             # facoltativo: dati di esempio, solo se la tabella è vuota
npm run dev                 # http://localhost:3001 con ricarica automatica
```

Controlla che risponda:

```bash
curl http://localhost:3001/api/health
# { "status": "ok", "service": "loglens-server", "timestamp": "..." }
```

## Script

| Script                    | Cosa fa                                                                      |
| ------------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`             | Avvia con ricarica automatica (tsx)                                          |
| `npm run build`           | Compila in `dist/` (tsup)                                                    |
| `npm start`               | Avvia il server compilato da `dist/`                                         |
| `npm run typecheck`       | Controlla i tipi senza produrre file                                         |
| `npm run prisma:migrate`  | Applica lo schema Prisma al database: controlla le modifiche e fai un backup |
| `npm run prisma:generate` | Rigenera il client Prisma                                                    |
| `npm run prisma:studio`   | Mostra i dati nel browser (come phpMyAdmin)                                  |
| `npm run db:seed`         | Aggiunge dati di esempio, solo se la tabella è vuota                         |
| `npm test`                | Esegue i test unitari una volta                                              |
| `npm run test:watch`      | Esegue i test e li ripete a ogni modifica                                    |

## Database

- **ORM:** Prisma 7, con l'adattatore per PostgreSQL. Lo schema è in `prisma/schema.prisma`; le impostazioni della CLI (indirizzo diretto, dati di esempio) sono in `prisma.config.ts`. Il client viene generato in `src/generated/prisma` da `npm run prisma:generate` (eseguito anche dopo `npm install`).
- **Database:** PostgreSQL (il piano gratuito di Neon va bene; anche Supabase).
- **Vedere i dati:** `npm run prisma:studio` apre un'interfaccia nel browser.
- **Servono due indirizzi di connessione** (vedi `.env.example`):
  - `DATABASE_URL`: connessione con pooler, usata dall'applicazione mentre gira
  - `DIRECT_URL`: connessione diretta, usata dalla CLI di Prisma (`prisma db push`)

## Motore AI

LogLens analizza i log tramite una sola interfaccia, `AIProvider`, con cinque
implementazioni intercambiabili, scelte dalla variabile `AI_PROVIDER` (in produzione va indicata esplicitamente e `mock` è rifiutato salvo `ALLOW_MOCK_PROVIDER=true`; il server non parte nemmeno con il `VISITOR_SALT` predefinito o debole):

| `AI_PROVIDER` | Motore                                        | Preparazione                              |
| ------------- | --------------------------------------------- | ----------------------------------------- |
| `mock`        | Un report plausibile già pronto               | Nessuna: funziona offline (predefinito)   |
| `rules`       | Motore a regole integrato                     | Nessuna: senza rete, deterministico       |
| `hybrid`      | Prima le regole, OpenAI solo per i log ignoti | Imposta `OPENAI_API_KEY`                  |
| `openai`      | OpenAI Chat Completions                       | Imposta `OPENAI_API_KEY`                  |
| `ollama`      | Modello Ollama locale                         | Installa Ollama e `ollama pull <modello>` |

Il flusso: `parseLog` riduce il log a un estratto, il motore restituisce un JSON, e lo
validiamo con Zod prima di usarlo. Il prompt è descritto in [`../docs/prompts.md`](../docs/prompts.md).

## Struttura

```text
src/
├── index.ts                          # punto di ingresso: avvia il server HTTP
├── vercel.ts                         # punto di ingresso su Vercel (senza listen())
├── app.ts                            # costruisce l'app Express
├── config/
│   └── env.ts                        # variabili d'ambiente validate (Zod + dotenv)
├── db/
│   └── prisma.ts                     # client Prisma condiviso (singleton, adattatore PostgreSQL)
├── parser/
│   ├── logParser.ts                  # funzione pura: estrae le righe rilevanti
│   └── lineFields.ts                 # ora, livello, indirizzo, codice esadecimale, id evento di una riga
├── ai/
│   ├── AIProvider.ts                 # l'interfaccia dei motori
│   ├── schema.ts                     # schema Zod del report AI
│   ├── prompt.ts                     # prompt di sistema e utente, delimitatore casuale a ogni richiesta
│   ├── parseReport.ts                # legge e valida il JSON del motore
│   ├── guardReport.ts                # controlla il report contro il log da cui nasce
│   ├── correlation.ts                # collega gli eventi di un log: causa radice, effetti, indirizzi in comune
│   ├── index.ts                      # fabbrica: sceglie il motore dalle variabili d'ambiente
│   └── providers/                    # mock, rules, hybrid, openai, ollama
├── content/
│   └── rules.ts                      # motore a regole: errori noti e consigli
├── services/
│   ├── analysisService.ts            # parser -> motore AI -> report validato
│   ├── addCorrelation.ts             # aggiunge quadro generale, findings e cronologia a un report del modello
│   ├── attemptLimit.ts               # limiti orari: una transazione con lock controlla e registra il tentativo
│   ├── retention.ts                  # cancella le analisi oltre i 90 giorni di conservazione
│   └── saveAnalysis.ts               # analizza un log e salva il report
├── repositories/
│   └── analysisRepository.ts         # tutte le query al database sulle analisi
├── schemas/
│   ├── createAnalysis.ts             # corpo di POST /api/analyses
│   └── feedback.ts                   # corpo di PUT /api/analyses/:id/feedback
├── types/
│   └── report.ts                     # tipi del report
├── routes/
│   ├── analyses.ts                   # /api/analyses (richiede X-Visitor-Id)
│   ├── cron.ts                       # GET /api/cron/retention (Vercel Cron, richiede CRON_SECRET)
│   ├── health.ts                     # GET /api/health
│   └── shared.ts                     # GET /api/shared/:token (link segreto, sola lettura)
└── middleware/
    ├── apiRateLimit.ts               # 120 richieste al minuto per indirizzo su tutte le rotte /api
    ├── clientAddress.ts              # indirizzo di chi chiama, fidato dietro un proxy solo con TRUST_PROXY
    ├── visitor.ts                    # intestazione con l'id del visitatore e controllo del proprietario
    ├── errorHandler.ts               # gestione centralizzata degli errori (503 se il database non risponde; il log non contiene mai i dati di una query fallita)
    └── notFound.ts                   # risposta JSON 404

prisma/
├── schema.prisma                     # il modello dei dati (Analysis, AnalysisAttempt)
└── seed.ts                           # dati di esempio per lo sviluppo
```

I test (`*.test.ts`) stanno accanto al file che provano.

## API

| Metodo   | Percorso                     | Descrizione                                                           |
| -------- | ---------------------------- | --------------------------------------------------------------------- |
| `GET`    | `/api/health`                | Controllo che il server sia vivo                                      |
| `POST`   | `/api/analyses`              | Analizza un log e salva il risultato                                  |
| `GET`    | `/api/analyses`              | Cronologia di questo visitatore (riassunti leggeri)                   |
| `DELETE` | `/api/analyses`              | Cancella la cronologia di questo visitatore                           |
| `DELETE` | `/api/analyses/:id`          | Cancella una analisi di questo visitatore                             |
| `GET`    | `/api/analyses/:id`          | Una singola analisi con il report completo                            |
| `PUT`    | `/api/analyses/:id/feedback` | Segna utile (`true`), non utile (`false`) o toglie il voto (`null`)   |
| `POST`   | `/api/analyses/:id/share`    | Crea il link segreto in sola lettura (o restituisce quello esistente) |
| `DELETE` | `/api/analyses/:id/share`    | Revoca il link segreto                                                |
| `GET`    | `/api/shared/:token`         | Report in sola lettura dietro un link segreto, senza il log grezzo    |
| `GET`    | `/api/cron/retention`        | Cancella le analisi oltre i 90 giorni; chiamata ogni giorno da Vercel |

Ogni rotta `/api/analyses` richiede l'intestazione `X-Visitor-Id`, altrimenti risponde `400`. L'id è un valore casuale che il browser conserva (un UUID); un id troppo regolare per essere casuale viene rifiutato. Non è un login: si comporta come un cookie di sessione, quindi chi lo possiede può leggere e cancellare quella cronologia.
La rotta `/api/shared/:token` non richiede intestazioni: il token è il permesso. Il report che restituisce ha ogni segreto e indirizzo e-mail mascherato a ogni livello (incidenti, prove, Markdown), porta incidenti, motore, copertura e validazione del report ma mai il log grezzo, il proprietario o l'hash dell'indirizzo. Viene inviato con `Cache-Control: no-store`, `X-Robots-Tag: noindex` e `Referrer-Policy: no-referrer`.
Tutte le rotte `/api` rispondono `429` a un indirizzo che supera le richieste al minuto consentite.

`GET /api/cron/retention` richiede `Authorization: Bearer <CRON_SECRET>`, che Vercel Cron invia
da solo (la pianificazione è in `vercel.json`). Senza `CRON_SECRET` rifiuta ogni chiamata. Le analisi
scadute vengono cancellate anche a ogni `GET` e `POST /api/analyses`, perché l'hosting esegue la
pianificazione una sola volta al giorno.

Corpo di `POST /api/analyses`:

```json
{ "rawLog": "ERROR ...", "source": "paste", "fileName": "app.log" }
```

Solo `rawLog` è obbligatorio; `source` (`paste` | `upload`) e `fileName` sono facoltativi.
