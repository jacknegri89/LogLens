# Changelog

Modifiche approvate, dalla più recente.

## 2026-11-08

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
