# Changelog

Modifiche approvate, dalla più recente.

## 2026-11-08 (audit di sicurezza e affidabilità)

Ramo `fix/security-reliability-audit`, non ancora unito.

- Report condivisi: ogni stringa, a ogni profondità (incidenti, prove, titoli, Markdown), passa dal mascheramento e gli indirizzi e-mail diventano `[email]`, ogni volta che il link viene aperto (vale anche per i report vecchi). Il report condiviso ora porta `incidents`, `engine`, `coverage`, `validation` e `promptInjection`; mai `rawLog`, `owner`, `clientHash`. Il mascheramento nasconde anche un token scritto dentro una frase ("the token tok\_… expired").
- Contesto per il modello: gli id di sessione sono pseudonimizzati (`session-1`) in id, gruppi, messaggi e attributi (prima restavano in chiaro nel testo); servizi, categorie e note dei legami sono mascherati; il limite `AI_CONTEXT_MAX_CHARS` vale per l'intero documento (prima contava solo gli eventi) e per ogni incidente si dichiara quanti guasti sono stati tagliati. Mascheramento finale comune a OpenAI e Ollama (`ai/maskInput.ts`), con test che leggono il corpo della richiesta HTTP.
- Configurazione di produzione: senza `AI_PROVIDER` o con `mock` (salvo `ALLOW_MOCK_PROVIDER=true`), con `VISITOR_SALT` predefinito, corto o povero, o con un `CORS_ORIGIN` che non è un'origine semplice, il server non parte. Avvisi (senza fermare il server) per `TRUST_PROXY` falso e `CRON_SECRET` mancante. **Prima del prossimo deploy controlla queste variabili su Vercel.**
- Causa radice: un modello non promuove più la certezza citando eventi che esistono. Per salire sopra lo stato del motore deve citare eventi dello stesso incidente legati ai suoi guasti da un legame causale (possibile → non verificata; probabile o confermato → probabile); con contraddizioni resta "non verificata"; "confermata" solo se la conferma è del motore. Prima bastava citare due eventi qualsiasi per passare da "insufficiente" a "probabile". Le evidenze di un altro incidente non sono usate (codice `unrelated-evidence`).
- Titolo, cause, passi e testo dell'issue scritti dal modello sono controllati sul log: frasi con ordini, importi, orari o eventi inesistenti rimosse, righe inventate in un blocco di codice sostituite da un avviso, comandi pericolosi rimossi o con avviso; senza una causa provata le cause sono mostrate come ipotesi. Via anche i link Markdown `javascript:`, `data:`, `vbscript:`, `file:`.
- Limiti orari: riprodotto che 6 richieste insieme con limite 2 ne facevano passare 0; ora verifica e scrittura sono un'unica transazione PostgreSQL con `pg_advisory_xact_lock`, passano esattamente quante ne sono ammesse e un tentativo rifiutato non viene scritto. La mappa del limite al minuto ha un tetto reale. Id visitatore troppo regolari rifiutati.
- Errori: il log del server non contiene più il messaggio intero (un errore Prisma può contenere il log del visitatore); database irraggiungibile → 503; il cron toglie anche i tentativi scaduti. Client: timeout su ogni richiesta (30 s, 90 s per l'analisi), id codificati negli indirizzi.
- CI: lint anche sul server (ESLint con la stessa base del client), `npm audit` su radice/server/client, build del bundle Vercel, permessi minimi. Il server riceve gli overrides del client (audit a zero). 15 input ostili nei test.
- Testo della pagina privacy: la frase su OpenAI ora descrive il riepilogo strutturato mascherato al posto di "un estratto del log". Il testo aveva un parere legale: da rivedere.

## 2026-11-08 (motore di analisi con causa radice)

Ramo `feature/rca-upgrade`, unito in `main` il 2026-11-08.

- Parser universale (`server/src/parser/`): ogni record diventa un `NormalizedLogEvent` (Zod) con orario e grado di certezza, livello, servizio, identificatori, stack trace e righe originali. Formati misti nello stesso file, stack trace multiriga interi, fusi orari, righe illeggibili conservate come eventi `unparsed`.
- Selezione del contesto (`server/src/analysis/contextSelection.ts`) al posto del filtro che scartava: guasti, modifiche, cambi di stato, eventi con identificatori condivisi e finestre attorno. Scansione a blocchi sovrapposti, budget, record di copertura; l'analisi parziale è dichiarata, mai presentata come completa.
- Motore di correlazione (`analysis/eventCorrelation.ts`): legami con certezza (confermato, probabile, possibile) e motivi di incertezza; l'orario da solo non è mai un legame; nessun ciclo. Incidenti e causa radice (`incidents.ts`, `rootCause.ts`): ipotesi verificate sulle prove e su ciò che le contraddice; stato confermata, probabile, ipotesi non verificata, informazioni insufficienti. Gravità da impatto reale (`incidentImpact.ts`).
- Hybrid ridisegnato (`ai/providers/hybridProvider.ts`): un incidente complesso va al modello anche se una regola corrisponde; budget di chiamate, costo, contesto e tempo (`ai/aiBudget.ts`, variabili `AI_*` e `ANALYSIS_MAX_SELECTED_EVENTS`); se il modello non c'è rispondono le regole e `engine.fallbackReason` dice perché. Il report dice quale motore lo ha scritto.
- Prompt revisionato (`content/analystPrompt.ts`): correlazione basata su prove al posto delle regole rigide (stesso ID obbligatorio, "un solo incidente infrastrutturale"), nessuna conclusione tecnica di default (409 non è rete, timeout non è perdita di pacchetti, 500 non è critico, attacco non è compromissione). Scala di gravità basata sull'impatto. Contesto strutturato in JSON per il modello (`ai/structuredContext.ts`).
- Evidence Validator (`ai/evidenceValidator.ts`, `ai/incidentReport.ts`): id, righe, citazioni, ordini, importi e orari controllati sul log; certezza limitata dai legami; comandi pericolosi con avviso. Mascheramento dei segreti prima dei provider esterni (`analysis/masking.ts`); righe di prompt injection segnalate e non eseguite (`analysis/promptInjection.ts`).
- Report: nuovi campi `incidents`, `engine`, `coverage`, `validation`, `promptInjection` (campi precedenti invariati, nessuna migrazione). Interfaccia: sezione Incidenti con causa radice evidenziata, prove cliccabili che aprono la riga del log originale, cronologia completa, impatto osservato e potenziale, avviso di analisi parziale e del motore usato.
- Benchmark (`server/benchmarks/`, `npm run benchmark`, `docs/benchmarks.md`): 15 scenari con risposte note incluso il caso TTL, metriche e confronto con l'analisi precedente. Nessuna API a pagamento.
- La bacheca dei reperti si disegna dagli incidenti (`client/src/lib/incidentBoard.ts`) e, quando ci sono incidenti, il riepilogo e l'elenco dei problemi precedenti (con le categorie delle regole) non si mostrano più: raccontavano una storia diversa. Script `npm run benchmark:live` per provare un modello vero (costa, lo lanci tu).
- Prove su log realistici senza identificatori (esempi del progetto, SSH, nginx, Kubernetes, Python): il motore spezzava tutto in incidenti separati. Ora la stessa famiglia di guasto ripetuta (es. accessi falliti) è una ricorrenza, i guasti a meno di un secondo nello stesso posto sono raggruppati dichiarando "solo per vicinanza di tempo", e le regole con MITRE/OWASP segnano un tentativo di sicurezza. I segreti sono mascherati in tutto ciò che il motore aggiunge al report (non nei campi di prima, che citano le righe come sono per poterle numerare). Prova a caso su 400 log casuali e input ostili (nessuna riga persa, nessun errore, 200.000 righe in 1,4 s).
- Copertura dei formati (`server/benchmarks/fixtures/formatCorpus.ts`, 44 esempi più file misti e rimescolati): aggiunti logcat Android, IIS W3C, HAProxy, AWS ALB, CSV, Redis, JSON stampato su più righe, journald JSON, orari con epoch iniziale, microsecondi e senza anno, codici colore ANSI e BOM, parole di guasto (memoria, crash, panic) e frasi che negano il guasto ("errors=0"). Un evento di testo Windows ora finisce al record successivo invece di inghiottire il resto del file.
- Tempo massimo di una chiamata al modello portato a 40 secondi (`AI_TIMEOUT_MS`): con un log complesso `gpt-4o-mini` impiega 14-20 secondi. La durata massima della funzione su Vercel è ora 60 secondi, scritta in `.vc-config.json` da `server/scripts/build-vercel.mjs` (con l'output già costruito `vercel.json` non la legge).
- Prova su log veri pubblici (collezione Loghub, 16 sistemi da 2000 righe: Apache, HDFS, Hadoop, Spark, ZooKeeper, OpenStack, BGL, HPC, Thunderbird, Windows, Linux, macOS, Android, HealthApp, Proxifier, OpenSSH). Sui 143 allarmi etichettati di Blue Gene/L il motore ne trova 143. Correzioni: livello dopo intestazioni lunghe, orari BGL (`2005-06-03-15.42.50.675872`) e HDFS (`081109 203615`), inizio record di BGL/Thunderbird/HDFS nei file misti, "80@0 failed" non è più letto come "0 failed" (zero errori), "errore corretto", "alignment exceptions" e "No configuration change required" non sono più guasti o modifiche, "AuthFail", "err=-12785", "connection reset", "aborted", "cannot assign" ora sono guasti. Righe INFO di BGL segnalate a torto: da 602 a 278. Cinque campioni veri aggiunti al corpus (ora 59).
- Prova su log inventati da un modello vero (`npm run benchmark:generate -- --yes`, `npm run benchmark:ai -- --yes`): su 3 lotti da 48 spezzoni di sistemi mai visti il motore trovava 77%, 83% e 88% delle righe di guasto. Ogni caso mancato è finito nel corpus ed è stato corretto (IIS senza intestazione, Varnish, CouchDB, kernel, Oracle, RabbitMQ, eventi Kubernetes, auditd). Resta un limite: un formato sconosciuto può nascondere qualche guasto.
- Correzioni emerse dai benchmark: `[worker]` letto come thread, riga JSON troncata incollata alla precedente, incidenti di soli warning valutati troppo gravi.

## 2026-11-08

- Rimossi i documenti di passaggio di consegne (`docs/HANDOFF-*.md`), ormai superati, e i vecchi rami locali già uniti a `main`.
- Ramo `handoff/revisione-2026-11-05` rivisto e unito: regole di sintassi del codice (nessun ternario, nessun `if` o ciclo senza graffe in tutto il repository, esempi di codice JavaScript nelle stringhe compresi), privacy dei report e dei link di condivisione, limiti e timeout sugli input, correzioni di prestazioni nel parser e nell'interfaccia.
- Limite di richieste per minuto su tutte le API (`middleware/apiRateLimit.ts`, `API_RATE_LIMIT_PER_MINUTE`, 120 per indirizzo), prima della lettura del corpo della richiesta.
- Le schede Correzione e Chiedi del Workbench mostrano un messaggio "non ancora disponibile" invece di un riquadro vuoto.
- README rifatto in inglese (con indice, schermate nuove, diagramma, configurazione, sicurezza e limiti) e copia in italiano in `README.it.md`; lo stesso per `server/README.md`. `docs/architecture.md` allineato al codice.
- Titolo e descrizione diversi per ogni pagina (`hooks/usePageMeta.ts`, `content/pageMeta.ts`), tag Open Graph in `index.html`, `/workbench` e `/privacy` nella sitemap. La pagina di dettaglio ha sempre un h1, anche mentre carica o in errore.
- Test end-to-end corretto: aspettava il caricamento della pagina Workbench prima di scegliere il file, e falliva sulla CI più lenta (riprodotto con CPU rallentata 4 volte).

## 2026-11-04

- Rimosso l'endpoint `POST /api/ingest` con `INGEST_TOKEN`: route, test e variabile d'ambiente eliminati. Restano `POST`, `GET` e `DELETE /api/analyses` come prima.
- Rimossa la GitHub Action di invio log (`action/loglens`).
- Header su telefono: il menu va su una riga propria; l'header resta in cima e si nasconde scorrendo giù, riappare scorrendo su (`client/src/hooks/useHeaderVisibility.ts`).
- Lingua sul desktop di nuovo accanto al menu; sul telefono resta accanto al logo.
- Nuova pagina `/privacy` (IT/EN): titolare, dati, basi giuridiche, destinatari, conservazione, cookie e diritti. Link nel footer.
- Vercel Analytics non registra più il token dei link di condivisione (`client/src/lib/analyticsPrivacy.ts`).
- I tentativi di analisi con hash dell'indirizzo vengono cancellati dopo un'ora (`services/attemptLimit.ts`).
- Analisi cancellate automaticamente 90 giorni dopo il salvataggio (`services/retention.ts`), alla lettura e all'invio della cronologia, e ogni giorno da Vercel Cron (`GET /api/cron/retention`, protetto da `CRON_SECRET`, pianificato in `vercel.json`).
- Workbench allineato allo stile del sito: titolo, schede e pulsanti; schede a scorrimento su telefono.
- Test client eseguiti anche nella CI.
- Prisma 7 (adattatore PostgreSQL, `prisma.config.ts`, client in `src/generated/prisma`): vulnerabilità alte di produzione risolte.
- Dipendenze di sviluppo aggiornate: vitest, vite, esbuild, Playwright, typescript-eslint. Dove serve, versioni fissate con `overrides`: `npm audit` non segnala più nulla in server e client.
- Intestazioni di sicurezza su tutte le risposte (Content-Security-Policy, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, HSTS). Rimosso lo script inline di caricamento dei font.

## 2026-11-03

- Analisi per tutti i provider: quadro generale, ordine degli eventi e findings calcolati dal server anche quando a rispondere è il modello (`server/src/services/addCorrelation.ts`).
- Analisi AI più rigida: pre-filtro del rumore (health check, probe, asset statici) prima dell'invio, categorie nuove per eventi auth e WAF, e system prompt con il ruolo SRE/Cyber Security Tier 3 in 4 fasi (testo del proprietario, parola per parola) più il contratto JSON. Il report segue le 4 sezioni richieste.
- API: `DELETE /api/analyses/:id` e `POST /api/ingest` (chiuso finché non c'è `INGEST_TOKEN`; richiede `Authorization: Bearer`). Il limite orario è ora in `services/attemptLimit.ts`, condiviso dalle due route.
- Grafica rifatta: "la stanza delle prove". Scrivania con lampada e grana, hero con muro di log e lente, editor come foglio con clip, scansione con etichette E1/E2 timbrate, report come fascicolo (timbro di gravità, bacheca con filo rosso tra causa radice ed effetti), storico come cassetto di schede, pagina condivisa e 404 nello stesso stile. Tutto con `prefers-reduced-motion` rispettato.
- Il report ha il campo `timeline` (eventi in ordine, ruolo root/effect/independent) che disegna il filo rosso.
- Pulsante Clear nell'editor; avviso prima di condividere un link; frasi del quadro generale tagliate a parola intera.
- Quadro generale nel motore a regole: gli eventi di un log vengono collegati (causa radice e sintomi, ordine nel tempo, indirizzo condiviso). Il report ha il campo `overview`, la sezione "Big picture" e un titolo che descrive la causa radice. Tabella delle relazioni in `server/src/content/correlations.ts`.
- Un login riuscito dopo almeno 3 tentativi falliti dallo stesso indirizzo porta il report a `critical` ("possibile brute force riuscito"). Il parser tiene le righe `Accepted password|publickey` per vederlo.
- Nuova regola per il pool di connessioni esaurito (Database).
- Modalità `hybrid`: regole prima, OpenAI solo per i log che nessuna regola copre.
- Il fallback cita la riga di errore esatta, o dice quando non c'è alcun errore.
- Pulsante "Delete history" nello storico, con conferma; endpoint `DELETE /api/analyses` limitato al visitatore.
- Il limite conta anche i tentativi falliti (tabella `AnalysisAttempt`).
- Titoli leggibili per i log di accesso (`GET /percorso returned 500`).
- Dipendenze aggiornate per le vulnerabilità: express, body-parser, morgan, zod, react-router-dom.
- Refactor: `FAILURE_LINE` in un solo punto, rimosso `listAnalyses` inutilizzato, logica dello storico in `useClearHistory`.
- 21 nuove regole in `server/src/content/rules.ts`: TLS (certificato scaduto e handshake), Redis, Docker, panic Go/Rust, .NET, PHP, Ruby, nginx, systemd, eviction Kubernetes, eccezioni Java, SQLite bloccato, tabelle e colonne mancanti, troppi file aperti, host irraggiungibile, credenziali cloud, JSON non valido, TypeError, vincolo NOT NULL, errori HTTP 4xx.
- Il parser riconosce i livelli syslog `ERR`, `CRIT`, `ALERT`, `EMERG` solo in maiuscolo.
- Il limite conta client e globale in parallelo, con una sola attesa.
- La chiamata a OpenAI si interrompe dopo 20 secondi e risponde 504.
- Il fallback legge dalla riga di errore ora, livello, indirizzo, codice esadecimale ed event id (`server/src/parser/lineFields.ts`).
- Prompt: confine casuale per ogni richiesta e sezione "dati non attendibili"; cita OWASP e MITRE; titoli del report in italiano.
- `server/src/ai/guardReport.ts`, applicato a OpenAI e Ollama: la severità non scende sotto il minimo di un attacco o di un hint `high`; le evidenze devono essere righe reali del log.
- API nuove (solo server, interfaccia in arrivo): `PUT /api/analyses/:id/feedback`, `POST` e `DELETE /api/analyses/:id/share`, `GET /api/shared/:token` pubblico senza log grezzo.
- Colonne `helpful` e `shareToken` su `Analysis`: da applicare a mano su Neon, non ancora in produzione (vedi `docs/decisions.md`).

## 2026-11-02 (audit)

- Controllo del visitatore con test dedicato (`requireVisitorOwner`).
- End-to-end eseguito anche nella CI su GitHub Actions.
- `App` ed `EditorToolbar` spezzati, `useAnalysis` con un solo stato.

## 2026-11-02 (refactor)

- Funzioni spezzate: il client usa hook e componenti piccoli (`useAnalysis`, `useLoad`, `usePointerLens`, `LogEditor`, `ReportView`).
- Testi visibili spostati in `client/src/content/` e `server/src/content/rules.ts`.
- Documenti richiesti dalle regole: changelog, decisioni, backlog, stato e checklist.

## 2026-11-02

- Controlli di qualità: formattazione Prettier, funzioni brevi, testi spostati in file di contenuto.
- Il seed non cancella più le analisi (`prisma:migrate` crea solo le tabelle).
- Le richieste senza identificativo visitatore ricevono 400 invece di leggere le righe condivise.
- Documentazione aggiornata: Neon su Vercel, motore a regole senza chiave, cronologia per visitatore, limiti di richieste.
- Aggiunti sitemap, robots.txt e verifica del sito per Google.

## 2026-11-01

- Test end-to-end con Playwright per l'allineamento delle righe del log.
- Righe lunghe a capo, con numeri di riga allineati.
- Lente trascinabile su telefono; indizio di trascinamento sulla lente.
- Cronologia separata per visitatore e limiti di richieste.
- Motore di analisi a regole, senza chiave API.
- Deploy su Vercel con database Neon.
