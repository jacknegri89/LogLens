<div align="center">

<img src="client/public/favicon.svg" width="72" height="72" alt="Logo di LogLens: una lente d'ingrandimento su una riga di log" />

# LogLens

**Trova la riga che ha ceduto.**

Incolla un log o uno stack trace. LogLens segna le righe che falliscono, valuta quanto è grave il
problema, spiega le cause probabili e prepara la issue GitHub, pronta da copiare.

[**Demo online**](https://loglens-demo.vercel.app) ·
[English](./README.md) ·
[Architettura](./docs/architecture.md) ·
[Changelog](./docs/changelog.md)

[![CI](https://github.com/jacknegri89/LogLens/actions/workflows/ci.yml/badge.svg)](https://github.com/jacknegri89/LogLens/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)

<img src="docs/screenshots/analyze.jpg" alt="La home di LogLens: una lente d'ingrandimento su una stampa di righe di log, con le righe che falliscono evidenziate" width="860" />

</div>

## Indice

- [Cosa fa](#cosa-fa)
- [Come si presenta](#come-si-presenta)
- [Come funziona](#come-funziona)
- [Avvio rapido](#avvio-rapido)
- [Configurazione](#configurazione)
- [API](#api)
- [Struttura del progetto](#struttura-del-progetto)
- [Controlli di qualità](#controlli-di-qualità)
- [Pubblicazione su Vercel](#pubblicazione-su-vercel)
- [Sicurezza e privacy](#sicurezza-e-privacy)
- [Stato e limiti](#stato-e-limiti)
- [Documentazione](#documentazione)
- [Licenza](#licenza)

## Cosa fa

LogLens trasforma un muro di testo di log in una risposta su cui puoi agire.

**Analisi**

- Incolla un log o uno stack trace, oppure trascina un file `.txt` / `.log`. Il formato viene riconosciuto da solo: syslog, JSON lines, errori Node.js, traceback Python, stack trace Java, Docker e Kubernetes, PostgreSQL, log di accesso nginx e Apache, eventi Windows.
- **Ogni evento viene letto, niente va perso alla cieca.** Formati misti nello stesso file, stack trace tenuti interi, fusi orari e righe fuori ordine gestiti. Il rumore di routine (health check, probe, file statici) viene messo da parte ma contato; gli eventi attorno a un guasto, i deploy, le modifiche di configurazione e i pagamenti restano come contesto.
- **Incidenti con causa radice.** I guasti che il log collega diventano un incidente ciascuno; i problemi indipendenti restano separati. Una causa radice è **confermata** solo se la mostra il log stesso, altrimenti **probabile**, **ipotesi non verificata** o **informazioni insufficienti**. Ogni affermazione rimanda alla riga originale del log.
- Ogni problema riceve una **gravità** (da informativa a critica) e una **categoria**, con **cause** probabili e **passi di debug**.
- Gli eventi collegati vengono uniti: prima la causa radice, poi ciò che ha scatenato, in ordine di tempo. Tanti accessi falliti da uno stesso indirizzo seguiti da uno riuscito vengono segnalati come possibile intrusione a forza bruta.
- Viene preparata una **issue GitHub** formattata, pronta da copiare.
- Un **motore a regole** integrato (più di 50 regole) funziona senza chiavi e senza rete. In modalità `hybrid` **OpenAI** ragiona sugli incidenti complessi (più servizi, una modifica prima dei guasti, una causa non chiara) e sui log che nessuna regola copre; quelli semplici restano alle regole. **Ollama** usa un modello locale, gratis. Ogni report dice quale motore lo ha scritto, e che nessuna AI è stata usata quando è così.
- La pagina e i report parlano **inglese e italiano**.

**Conserva e condividi**

- Ogni analisi finisce in una cronologia che solo il suo proprietario può vedere, e resta per 90 giorni. Una copia resta nel browser, così la cronologia si apre anche se il server è spento.
- Condividi un report con un link segreto in sola lettura. Il log originale non è mai incluso, e il link si può revocare in ogni momento.
- Segna un report come utile o non utile.

**Workbench**: strumenti che lavorano su un log senza uscire dal tuo browser.

- **Explorer** con un piccolo linguaggio di ricerca (`level:ERROR service:pay* latency:>200 -healthcheck`), una lista virtuale che resta fluida anche con log enormi, e archivi `.gz`, `.zip` e `.tar` aperti in locale.
- **Gruppi** che riuniscono le righe simili, **Tracce** che seguono una richiesta tra più servizi.
- **Laboratorio**: un prova-regex che non può bloccare la pagina, un confronto di log, un lettore di source map e una coda in tempo reale.
- **Sicurezza**: un controllo dei pattern sospetti e uno strumento che nasconde i dati sensibili.
- **Metriche**: punteggio di rischio, flame graph e mappa dei servizi coinvolti.
- **Esporta** come issue GitHub, messaggio Slack, evento PagerDuty, post-mortem o JSON, più i permalink. Una palette di comandi (`Ctrl K`) raggiunge tutto.

## Come si presenta

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/report.jpg" alt="Un report: il guasto scritto su una scheda, con il timbro GRAVITÀ ALTA, poi la bacheca delle prove" /></td>
    <td width="50%"><img src="docs/screenshots/workbench.jpg" alt="L'Explorer del Workbench: un log caricato con la barra di ricerca e la lista delle righe" /></td>
  </tr>
  <tr>
    <td align="center"><sub><b>Il report</b>: cosa è fallito, quanto è grave e le prove.</sub></td>
    <td align="center"><sub><b>Il Workbench</b>: cerca, raggruppa e ispeziona un log nel browser.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/history.jpg" alt="La pagina della cronologia: un cassetto di analisi salvate" /></td>
    <td width="50%" align="center"><img src="docs/screenshots/mobile.jpg" alt="La home su un telefono" width="260" /></td>
  </tr>
  <tr>
    <td align="center"><sub><b>Cronologia</b>: tutte le analisi degli ultimi 90 giorni, solo tue.</sub></td>
    <td align="center"><sub><b>Su telefono</b>: le stesse pagine, disposte per uno schermo piccolo.</sub></td>
  </tr>
</table>

> Le schermate arrivano dalla demo online, che usa `AI_PROVIDER=hybrid`: rispondono prima le regole integrate, e OpenAI interviene solo sui log che nessuna regola copre.

## Come funziona

```mermaid
flowchart LR
    U[Tu] -->|incolla o carica| C[Client React]
    C -->|POST /api/analyses| A[API Express]
    A -->|limiti e validazione| L{Consentito?}
    L -->|no| E[429 / 400]
    L -->|sì| N[Normalizza ogni evento]
    N --> S[Seleziona il contesto]
    S --> K[Correla e trova gli incidenti]
    K -->|semplice| R[Motore a regole]
    K -->|complesso| M[OpenAI o Ollama]
    R --> V[Verifica delle prove]
    M --> V
    V -->|salva| D[(PostgreSQL)]
    V -->|report| C
```

1. **Normalizza.** Ogni record del log diventa un evento (orario con il suo grado di certezza, livello, servizio, identificatori, stack trace, righe originali). Una riga che non si riesce a leggere viene tenuta, non scartata.
2. **Seleziona il contesto.** Restano i guasti, le modifiche, i cambi di stato, gli eventi che condividono un identificatore con un guasto e quelli attorno; il traffico di routine è contato, non letto. I log grandi sono scorsi a blocchi sovrapposti e, se un limite taglia qualcosa, il report dice che l'analisi è parziale.
3. **Correla.** Gli eventi si collegano solo con prove: un identificatore in comune, un valore modificato che i guasti successivi riportano, una dipendenza nominata dal log. L'orario da solo non è mai un legame. Ogni legame ha una certezza e i motivi per cui potrebbe essere sbagliato.
4. **Incidenti e causa radice.** I guasti collegati formano incidenti; ognuno ha ipotesi, verificate sulle prove e su ciò che le contraddice.
5. **Motore.** Gli incidenti semplici vanno al **motore a regole**. Un incidente **complesso** va al modello anche se una regola corrisponde; il modello giudica gli incidenti che riceve (non li crea) entro un budget di chiamate, costo e tempo. Se il modello non è disponibile rispondono le regole e il report dice perché.
6. **Verifica delle prove.** Ogni id di evento, riga, citazione, ordine, importo e orario del report è controllato sul log; le affermazioni non sostenute vengono tolte, la certezza è limitata dai legami, i comandi rischiosi ricevono un avviso. I segreti sono mascherati prima di inviare testo a un provider esterno.
7. Il report è validato con Zod, salvato con Prisma e restituito.

Il prompt, le sue quattro fasi e la difesa dal prompt injection sono descritti in [`docs/prompts.md`](./docs/prompts.md). Il progetto completo è in [`docs/architecture.md`](./docs/architecture.md). Il motore di analisi è misurato su 15 log realistici con risposte note, senza API a pagamento: vedi [`docs/benchmarks.md`](./docs/benchmarks.md) (`npm run benchmark` in `server/`).

## Avvio rapido

**Ti servono:** Node.js 20 o successivo e un database PostgreSQL (gratuito su [Neon](https://neon.tech) o [Supabase](https://supabase.com)). Una chiave OpenAI o [Ollama](https://ollama.com) sono facoltativi: il motore a regole non richiede nulla.

```bash
git clone https://github.com/jacknegri89/LogLens.git
cd LogLens
```

**Backend** (http://localhost:3001)

```bash
cd server
npm install                 # genera anche il client Prisma
cp .env.example .env        # poi inserisci DATABASE_URL e DIRECT_URL
npm run prisma:migrate      # crea le tabelle: controlla le modifiche e fai un backup se ci sono dati
npm run db:seed             # facoltativo: analisi di esempio, solo se la tabella è vuota
npm run dev                 # parte con ricarica automatica
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

Apri http://localhost:5173. Il client si aspetta l'API sulla porta 3001.

Provalo con i log in [`examples/`](./examples/): un'eccezione non gestita di Node.js, un avvio fallito di Docker Compose ed errori di connessione al database.

## Configurazione

Tutto si configura con variabili d'ambiente, validate all'avvio (un valore sbagliato ferma il server con un messaggio chiaro). In locale stanno in `server/.env`; su Vercel nelle impostazioni del progetto. I segreti non vanno mai nel codice né in git.

| Variabile                                                              | Predefinito                      | Cosa fa                                                                                      |
| ---------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                         | (obbligatoria)                   | Connessione PostgreSQL con pooler, usata dall'app                                            |
| `DIRECT_URL`                                                           | (obbligatoria per le migrazioni) | Connessione diretta, usata dalla CLI di Prisma                                               |
| `AI_PROVIDER`                                                          | `mock`                           | `mock`, `rules`, `hybrid`, `openai` oppure `ollama`                                          |
| `OPENAI_API_KEY`                                                       |                                  | Serve per `openai` e `hybrid`                                                                |
| `OPENAI_MODEL`                                                         | `gpt-4o-mini`                    | Il modello OpenAI                                                                            |
| `OLLAMA_BASE_URL`                                                      | `http://localhost:11434`         | Dove ascolta Ollama                                                                          |
| `OLLAMA_MODEL`                                                         | `llama3.2`                       | Il modello Ollama                                                                            |
| `ANALYSIS_MAX_SELECTED_EVENTS`                                         | `1500`                           | Massimo di eventi tenuti per l'analisi; oltre, il report dice che è parziale                 |
| `AI_CONTEXT_MAX_CHARS`                                                 | `24000`                          | Massimo di caratteri di contesto inviati a un modello                                        |
| `AI_CONTEXT_MAX_EVENTS`                                                | `250`                            | Massimo di eventi inviati a un modello                                                       |
| `AI_MAX_CALLS_PER_ANALYSIS`                                            | `1`                              | Chiamate al modello per analisi (`0` = non chiamare mai un modello)                          |
| `AI_MAX_COST_USD_PER_ANALYSIS`                                         | `0.05`                           | Costo stimato oltre il quale il modello non viene chiamato (rispondono le regole)            |
| `AI_INPUT_USD_PER_MILLION_TOKENS` / `AI_OUTPUT_USD_PER_MILLION_TOKENS` | `0.15` / `0.6`                   | Prezzi usati per la stima: impostali per il tuo modello                                      |
| `AI_TIMEOUT_MS`                                                        | `40000`                          | Quanto può durare una chiamata al modello prima che rispondano le regole                     |
| `RATE_LIMIT_PER_HOUR`                                                  | `5`                              | Tentativi di analisi per indirizzo all'ora, anche quelli falliti (`0` = nessun limite)       |
| `GLOBAL_LIMIT_PER_HOUR`                                                | `100`                            | Tentativi di analisi di tutti all'ora (`0` = nessun limite)                                  |
| `API_RATE_LIMIT_PER_MINUTE`                                            | `120`                            | Richieste al minuto da un indirizzo a tutta l'API, contate per istanza (`0` = nessun limite) |
| `TRUST_PROXY`                                                          | `false`                          | `true` dietro un proxy come Vercel, così i limiti contano i visitatori veri                  |
| `VISITOR_SALT`                                                         | `loglens`                        | Un testo casuale e lungo che dà il sale all'hash degli indirizzi. **Cambialo in produzione** |
| `CRON_SECRET`                                                          |                                  | Almeno 16 caratteri; Vercel Cron lo invia per cancellare le analisi oltre i 90 giorni        |
| `CORS_ORIGIN`                                                          | `*`                              | Origine consentita. In produzione lascialo vuoto: client e API usano lo stesso dominio       |

## API

| Metodo   | Percorso                     | Cosa fa                                                                  |
| -------- | ---------------------------- | ------------------------------------------------------------------------ |
| `POST`   | `/api/analyses`              | Analizza un log e salva il report                                        |
| `GET`    | `/api/analyses`              | La cronologia di questo visitatore                                       |
| `GET`    | `/api/analyses/:id`          | Una analisi con il report completo                                       |
| `DELETE` | `/api/analyses/:id`          | Cancella una analisi (`DELETE /api/analyses` le cancella tutte)          |
| `PUT`    | `/api/analyses/:id/feedback` | Segna utile, non utile, oppure toglie il voto                            |
| `POST`   | `/api/analyses/:id/share`    | Crea il link segreto in sola lettura (`DELETE` lo revoca)                |
| `GET`    | `/api/shared/:token`         | Il report condiviso, senza il log grezzo                                 |
| `GET`    | `/api/cron/retention`        | Cancella le analisi oltre i 90 giorni (Vercel Cron, richiede un segreto) |
| `GET`    | `/api/health`                | Controllo che il server sia vivo                                         |

Le rotte `/api/analyses` richiedono l'intestazione `X-Visitor-Id`: un id casuale che il browser conserva, non un login. Dettagli, corpi delle richieste e mappa del codice sono in [`server/README.it.md`](./server/README.it.md).

## Struttura del progetto

```text
LogLens/
├── client/               # React + TypeScript + Vite + Tailwind
│   ├── src/pages/        # analisi, cronologia, report, link condiviso, privacy
│   ├── src/content/      # tutti i testi visibili, in inglese e italiano
│   ├── src/workbench/    # il Workbench, una cartella per ogni scheda
│   └── e2e/              # test end-to-end con Playwright
├── server/               # Node.js + Express + TypeScript
│   ├── src/routes/       # le rotte /api
│   ├── src/parser/       # ogni formato → eventi normalizzati (orario, id, stack trace)
│   ├── src/analysis/     # selezione del contesto, correlazione, incidenti, causa radice
│   ├── src/ai/           # motore a regole, OpenAI / Ollama, prompt, budget, verifica delle prove
│   ├── benchmarks/       # log realistici con risposte note, metriche, `npm run benchmark`
│   ├── src/services/     # limiti, conservazione, salvataggio delle analisi
│   └── prisma/           # schema e dati di esempio
├── docs/                 # architettura, prompt, decisioni, stato, changelog
├── examples/             # log di esempio da provare
├── vercel.json           # comando di build e cron giornaliero
└── .github/workflows/    # CI
```

## Controlli di qualità

```bash
npm run format:check                 # Prettier, dalla radice del repository
npm run typecheck --prefix server
npm run typecheck --prefix client
npm run lint --prefix client
npm test --prefix server             # test unitari
npm test --prefix client             # test unitari
npm run test:e2e --prefix client     # Playwright, schermo da telefono
```

Gli stessi controlli, più le due build, girano a ogni push in [GitHub Actions](./.github/workflows/ci.yml). Le dipendenze sono controllate con `npm audit` e tenute a zero vulnerabilità note.

## Pubblicazione su Vercel

L'intera applicazione (client React e API Express) gira come un unico progetto Vercel, con PostgreSQL su Neon tramite l'integrazione di Vercel. Entrambi hanno un piano gratuito.

1. **Importa il repository** su [vercel.com](https://vercel.com) → _Add New → Project_. Non toccare le impostazioni di build: le contiene `vercel.json`.
2. **Aggiungi il database**: in _Storage_ aggiungi **Neon**. Vercel crea `DATABASE_URL` e `DIRECT_URL`.
3. **Aggiungi le variabili d'ambiente** della sezione [Configurazione](#configurazione). Su Vercel imposta almeno `AI_PROVIDER`, `TRUST_PROXY=true`, un `VISITOR_SALT` casuale e lungo, e `CRON_SECRET`. Aggiungi `OPENAI_API_KEY` per `openai` o `hybrid`.
4. **Crea le tabelle una volta**, dal tuo computer, con gli indirizzi di Neon in `server/.env`: `cd server && npm run prisma:migrate`.
5. **Pubblica**: fai il push sul ramo collegato, oppure esegui `npm run build:vercel` e pubblica `.vercel/output`.

Vercel Cron chiama `/api/cron/retention` ogni giorno alle 03:00 UTC (vedi `vercel.json`).

Se pubblichi una tua istanza, aggiorna contatto, regione del database e fornitori in [`client/src/content/privacy.ts`](./client/src/content/privacy.ts), e tieni i 90 giorni della pagina uguali a `ANALYSIS_RETENTION_DAYS` in `server/src/services/retention.ts`.

## Sicurezza e privacy

- **Nessun cookie.** La memoria locale del browser conserva solo le tue scelte (lingua, anonimizza, tema), un identificativo casuale del visitatore e una copia locale della cronologia. La [pagina privacy](https://loglens-demo.vercel.app/privacy) elenca cosa viene trattato, perché e per quanto tempo.
- **Anonimizza prima dell'invio.** Un interruttore sostituisce indirizzi IP, e-mail e segreti nel tuo browser, prima che qualcosa esca.
- **Limiti sui dati.** Le analisi si cancellano dopo 90 giorni, o prima da te. Gli indirizzi di rete sono conservati solo come hash con sale, e i tentativi che li usano vengono rimossi dopo un'ora.
- **I link condivisi** hanno un token impossibile da indovinare, non finiscono nei log, viaggiano con `Referrer-Policy: no-referrer`, non vengono indicizzati e si possono revocare.
- **Limiti contro gli abusi.** Limiti orari per indirizzo e globali sulle analisi, e un limite al minuto su tutta l'API.
- **Risposte protette.** Una Content-Security-Policy rigorosa, `X-Frame-Options`, `nosniff`, HSTS e una Permissions-Policy chiusa su ogni risposta.
- **L'output del modello non è fidato.** Viene validato, verificato sul log da cui nasce, ripulito da link e HTML, e il prompt usa un delimitatore casuale contro il prompt injection.
- **Anche il log non è fidato.** Una riga che cerca di dare ordini all'analizzatore viene segnalata e non eseguita. Token, password, chiavi e cookie sono mascherati prima di inviare qualsiasi cosa a un modello esterno; gli id di richiesta, traccia e ordine restano. In modalità e nessun log lascia il tuo computer.
- **Endpoint di pulizia.** `GET /api/cron/retention` rifiuta ogni chiamata senza `CRON_SECRET`, confrontato a tempo costante.

Anche così, non incollare segreti veri in un'istanza pubblica.

## Stato e limiti

- La correlazione dimostra ciò che il log mostra: se due servizi non condividono mai un identificatore e non si nominano, i loro guasti restano incidenti separati anche se una persona li collegherebbe. La causa radice è allora **probabile** o **insufficiente**, mai forzata.
- I report con incidenti non mostrano più il riepilogo e l'elenco dei problemi di prima; la bacheca dei reperti si disegna dagli incidenti. I report più vecchi mantengono la vista originale.
- Il percorso con il modello è stato provato solo con provider finti. `npm run benchmark:live -- --yes` lo esegue con la tua chiave (pochi centesimi).
- Le schede **Correzione** e **Chiedi** del Workbench mostrano "non ancora disponibile". Il loro codice è nel repository ma irraggiungibile finché non viene rivisto.
- Il limite di richieste al minuto è contato nella memoria di ogni istanza del server: ferma le raffiche, ma non è una quota globale. I limiti orari sulle analisi sono nel database e sono condivisi.
- La pulizia giornaliera segue la pianificazione di Vercel; le analisi oltre i 90 giorni vengono rimosse anche alla successiva lettura della cronologia o a una nuova analisi.

Vedi [`docs/stato.md`](./docs/stato.md) per lo stato attuale e [`docs/decisions.md`](./docs/decisions.md) per il perché delle scelte.

## Documentazione

| File                                             | Cosa contiene                                   |
| ------------------------------------------------ | ----------------------------------------------- |
| [`docs/architecture.md`](./docs/architecture.md) | Il flusso, i componenti e le scelte di progetto |
| [`docs/prompts.md`](./docs/prompts.md)           | Il prompt, le sue fasi e il contratto JSON      |
| [`docs/decisions.md`](./docs/decisions.md)       | Le decisioni, con motivo e alternative          |
| [`docs/changelog.md`](./docs/changelog.md)       | Cosa è cambiato e quando                        |
| [`docs/stato.md`](./docs/stato.md)               | Stato attuale e cosa resta                      |
| [`docs/checklist.md`](./docs/checklist.md)       | Gli ultimi controlli di fine task, PASS o FAIL  |
| [`server/README.it.md`](./server/README.it.md)   | Il backend: script, struttura e dettagli API    |

Segnalazioni e pull request sono benvenute. Esegui prima i [controlli di qualità](#controlli-di-qualità).

## Licenza

Rilasciato con [licenza MIT](./LICENSE) © 2026 Giacomo Negri.
