# Decisioni

Ogni voce: data, decisione, motivo, alternative scartate.

## 2026-11-09 — Anteprime social e pubblicazione

- **Un HTML per pagina, generato in build, senza SSR.** Un crawler che non esegue JavaScript legge solo l'HTML che riceve; con una sola `index.html` tutte le pagine avrebbero avuto i tag della home. Il plugin `client/plugins/socialPages.ts` scrive `workbench.html`, `privacy.html`, `shared.html` ecc. a partire da `pageMeta.ts` (la stessa tabella che imposta il titolo della scheda) e Vercel indirizza ogni percorso al suo file. Scartato: migrare a Next.js (costo sproporzionato per sette pagine) e un servizio di prerendering.
- **Pagine private senza canonical né `og:url`.** Cronologia, analisi, report condiviso e 404 sono `noindex` (meta e `X-Robots-Tag`). L'indirizzo di un report condiviso contiene il token: non viene copiato nei metadati. L'anteprima di un link condiviso è quindi generica e uguale per tutti, e non rivela nulla del report. Scartato: un'anteprima dinamica con il titolo del report (servirebbe leggere il report per ogni crawler, esponendo contenuti e rendendo la revoca meno netta).
- **`robots.txt` non blocca più `/shared/`.** Un crawler che non può leggere la pagina non vede nemmeno l'anteprima (Facebook rispetta `robots.txt`) e non vede il `noindex`. L'esclusione dall'indice è affidata a header e meta; `robots.txt` blocca solo `/api/`.
- **Immagine Open Graph in JPEG.** 1200×630, 112 KB: il PNG equivalente pesava 300 KB, il limite oltre cui alcune app (WhatsApp) smettono di mostrare l'anteprima grande. Il sorgente (`client/brand/og-image.html`) si rigenera con `npm run brand:render`.
- **Vero 404 per gli indirizzi sconosciuti** (prima 200 con la home), e cache di un anno per `/assets/*`, i cui nomi contengono l'hash del contenuto.

## 2026-11-08 — Audit di sicurezza e affidabilità

- **Report condiviso:** la pulizia avviene alla lettura, non al salvataggio. Il report del proprietario cita le righe com'è, così i numeri di riga funzionano; chi apre il link riceve solo testo mascherato. Motivo: vale anche per i report già salvati e non cambia i dati. Scartato: pulire alla scrittura (i vecchi report resterebbero esposti) e una migrazione del database.
- **Pseudonimi per le sessioni:** un id di sessione è una credenziale; al modello arriva `session-N`, stabile, così le relazioni tra eventi restano. Gli id di richiesta, traccia e ordine restano in chiaro: senza di essi il modello non segue una storia. Scartato: mascherare tutti gli identificatori.
- **Certezza della causa radice:** un modello può abbassarla sempre; può alzarla solo con prove che il motore stesso riconosce (un legame causale dagli eventi citati ai guasti dell'incidente). Esistere non è causare. "Confermata" resta del solo motore. Scartato: impedire ogni promozione (il modello deve poter migliorare una conclusione quando le prove ci sono).
- **Limite orario:** una transazione PostgreSQL con lock consultivo, non Redis: nessun servizio in più e il database c'è già. Il prezzo è che le prenotazioni fanno la coda per pochi millisecondi. Provato su un PostgreSQL vero con connessioni concorrenti (`attemptReservation.integration.test.ts`, in CI con un servizio PostgreSQL): senza il lock, 10 richieste simultanee con limite globale 4 passano tutte.
- **Visitatore senza account:** `X-Visitor-Id` resta un identificatore come un cookie di sessione, con un controllo contro id banali. Documentato che non protegge log sensibili. Scartato: login (non serve a una demo), hash dell'id nel database (renderebbe illeggibili le righe esistenti).
- **Produzione:** il server si rifiuta di partire con una configurazione debole invece di avvisare, per le variabili che non si possono correggere dopo (sale, provider). Per quelle correggibili (proxy, cron, CORS) solo avvisi.

## 2026-11-08 — Motore di analisi con prove e causa radice

- **Decisione:** l'analisi legge ogni evento (parser universale), sceglie il contesto invece di scartare, correla solo con prove e costruisce incidenti con una causa radice che ha uno stato (confermata, probabile, ipotesi non verificata, informazioni insufficienti). Un incidente complesso va al modello anche se una regola corrisponde; il modello giudica gli incidenti ricevuti, non li crea. Un validatore deterministico controlla ogni affermazione sul log.
- **Motivo:** il filtro per parole chiave perdeva gli eventi che spiegano i guasti (una modifica di configurazione è una riga INFO), la correlazione per soli identificatori o per categoria forzava conclusioni (la rete causa tutto) e una regola nota impediva al modello di vedere una catena complessa.
- **Prompt:** il testo del proprietario è stato rivisto, su richiesta, nelle sole regole di correlazione della fase 2 e nella scala di gravità; ruolo, quattro fasi e quattro sezioni del report restano. Il test che fissava le frasi rigide è stato aggiornato di conseguenza.
- **Vincoli:** niente modifiche al database (il report è JSON), campi precedenti invariati. La certezza "confermata" richiede che il log stesso mostri causa ed effetti; un'ipotesi del modello non può superarla. Un tentativo di attacco resta almeno "alto" come prima, ma non è mai una compromissione.
- **Scartato:** un grafo causale libero generato dal modello (non verificabile), tetti fissi su incidenti e cronologia (i limiti sono di visualizzazione, non di analisi), una coda o un servizio separato per i log grandi (la scansione a blocchi basta entro i limiti serverless).

## 2026-11-08 — Regole di sintassi e limite di richieste per minuto

- **Decisione:** nel codice JavaScript/TypeScript niente ternari e niente `if`, `else` o cicli senza graffe, anche negli esempi di codice dentro le stringhe. Un limite di 120 richieste al minuto per indirizzo protegge tutte le rotte `/api`, contato nella memoria di ogni istanza.
- **Motivo:** le regole di sintassi sono nel CLAUDE.md del proprietario. Il limite orario sulle analisi non copriva le altre rotte che leggono o scrivono sul database.
- **Vincoli:** su un host serverless ogni istanza conta per conto suo, quindi il limite ferma le raffiche ma non è una quota globale. La pulizia delle analisi scadute usa una richiesta GET protetta da `CRON_SECRET`, perché Vercel Cron chiama solo in GET: è l'unica eccezione alla regola di non modificare dati con GET.
- **Referrer-Policy:** `no-referrer` su tutte le risposte, più severo del valore `strict-origin-when-cross-origin` richiesto come minimo: i link di condivisione contengono un token.
- **Pannelli non pronti:** Correzione e Chiedi mostrano "non ancora disponibile"; il codice dei generatori (alert cron, Ollama dal browser) resta non raggiungibile e va rivisto prima di attivarlo (pianificazione oltre 59 minuti, sicurezza della cartella HOME, `connect-src` della CSP).
- **Scartato:** quota condivisa nel database per ogni richiesta, che aggiungerebbe una query a ogni chiamata.

## 2026-11-04 — Prisma 7 e intestazioni di sicurezza

- **Decisione:** Prisma 7 con l'adattatore PostgreSQL (`@prisma/adapter-pg`) e il client generato in `src/generated/prisma`; le URL del database stanno in `prisma.config.ts` (CLI) e in `src/db/prisma.ts` (applicazione). Ogni risposta riceve intestazioni di sicurezza da `config.json` generato da `scripts/build-vercel.mjs`: Content-Security-Policy che consente solo script, API e font di Google dichiarati, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, HSTS.
- **Motivo:** la versione 6 aveva tre vulnerabilità alte nelle dipendenze di produzione, corrette solo dalla 7. Le intestazioni erano richieste dalle regole del progetto e mancavano.
- **Vincoli:** lo stile usa attributi `style` di React, quindi la policy consente `unsafe-inline` solo per gli stili. Lo script di caricamento dei font inline è stato tolto, perché la policy lo bloccherebbe.
- **Scartato:** aggiornare solo le dipendenze di sviluppo, lasciando Prisma 6 con le vulnerabilità in produzione.

## 2026-11-04 — Cancellazione automatica dopo 90 giorni

- **Decisione:** le analisi (con log e report) vengono cancellate 90 giorni dopo il salvataggio, per tutti. La pulizia gira alla lettura e all'invio della cronologia, e una volta al giorno da Vercel Cron (`GET /api/cron/retention`, con `CRON_SECRET`).
- **Motivo:** il log può contenere dati personali; non serve conservarlo oltre il necessario. Il proprietario ha scelto 90 giorni.
- **Scartato:** una scadenza solo al momento della lettura, perché le analisi di chi non torna resterebbero per sempre. Una cancellazione a mano: non scala.
- **Vincolo:** l'hosting esegue la pianificazione una volta al giorno. Se il sito non viene usato, le analisi scadute restano fino al primo accesso o alla pianificazione successiva.

## 2026-11-04 — Hash dell'indirizzo con sale e pulizia dei tentativi

- **Decisione:** il server salva solo l'hash SHA-256 dell'indirizzo con `VISITOR_SALT`, e cancella i tentativi più vecchi di un'ora.
- **Motivo:** senza sale un hash di indirizzo IPv4 si inverte con poca fatica. I tentativi più vecchi di un'ora non servono più ai limiti.
- **Scartato:** conservare i tentativi per statistiche, perché darebbe dati personali senza un uso chiaro.

## 2026-11-04 — Link di condivisione redatti nelle statistiche

- **Decisione:** prima dell'invio a Vercel Analytics il token del link di condivisione viene sostituito con `[redacted]`.
- **Motivo:** il token nel percorso darebbe accesso al report a chiunque legga le statistiche.
- **Scartato:** disattivare Analytics: le statistiche aggregate servono e non usano cookie.

## 2026-11-04 — Pagina privacy e cookie

- **Decisione:** pagina `/privacy` bilingue con titolare, dati, basi giuridiche, destinatari, conservazione, cookie e diritti. LogLens non usa cookie: usa `localStorage` per le scelte dell'utente.
- **Motivo:** il sito tratta log che possono contenere dati personali e deve dirlo. Il testo è stato verificato da un professionista.
- **Scartato:** un banner dei cookie, perché non ci sono cookie da accettare.

## 2026-11-03 — Il modello riceve solo righe rilevanti e un prompt in 4 fasi

- **Decisione:** prima dell'invio il codice toglie il rumore di routine (health check, probe del load balancer, asset statici con esito normale) salvo che portino un errore o lo stesso trace id di una riga in errore, e dice al modello quanto ne ha tolto. Il system prompt apre con il testo del proprietario alla lettera; il contratto JSON, la scala di severità e le regole contro il prompt injection sono accodati.
- **Motivo:** il modello si distraeva sugli errori più vistosi (OOMKilled, 504), perdeva gli attacchi e univa eventi senza legame. Meno rumore e regole di correlazione esplicite riducono entrambi i problemi.
- **Scartato:** sostituire del tutto il prompt (il report salvato richiede il JSON validato con Zod e la difesa contro il prompt injection); il ruolo `developer` (non serve, `system` è accettato da tutti i modelli e da Ollama).
- **Adattamento:** le intestazioni emoji del report vanno in `bugReportMarkdown`; per un report in inglese sono tradotte.

## 2026-11-03 — Grafica "stanza delle prove" al posto dell'aspetto precedente

- **Decisione:** stessa palette (feltro, carta, evidenziatore, penna rossa), composizione nuova: carte inclinate con nastro e spillo, timbri, filo rosso SVG tra gli eventi collegati. Quattro momenti animati (lente dell'hero, scansione, filo rosso, timbro) e nient'altro oltre agli stati hover.
- **Motivo:** il filo rosso mostra la correlazione tra eventi, che è la funzione che distingue LogLens; la grafica precedente non aveva modo di mostrarla.
- **Scartato:** una nuova palette neon da terminale (aspetto da template) e una libreria di animazioni (peso e dipendenza).
- **Eccezione alle regole:** quattro animazioni invece di "una o due", richieste esplicitamente; tutte disattivate con `prefers-reduced-motion`.

## 2026-11-03 — Le diagnosi collegano gli eventi invece di elencarli

- **Decisione:** il motore a regole correla i risultati di un log: una relazione "può causare" tra categorie (tabella in `content/correlations.ts`), ordine per timestamp ISO completo, indirizzi e utenti condivisi, escalation per login riuscito dopo tentativi falliti (soglia 3).
- **Motivo:** ogni regola leggeva il log in isolamento, quindi un database rifiutato e l'errore di codice che ne deriva sembravano due bug separati.
- **Scartato:** dedurre le relazioni dall'AI (non deterministico, e vale solo per i log sconosciuti); riordinare per orari senza anno (syslog) perché non reggono la mezzanotte.
- **Limite:** la correlazione non c'è sul percorso OpenAI/Ollama; lì il prompt chiede al modello di separare causa radice e sintomi.

## 2026-11-03 — Condivisione con link segreto, senza account

- **Decisione:** `POST /api/analyses/:id/share` crea un token casuale di 24 byte in `shareToken`. `GET /api/shared/:token` mostra il report in sola lettura, senza il log grezzo e senza il proprietario. `DELETE` revoca il link.
- **Motivo:** il demo non ha login, ma un report va mostrato senza esporre la cronologia né il log incollato. Il token è il permesso, quindi revocarlo chiude l'accesso.
- **Scartato:** account con login (troppo per un demo) e l'ID della riga come link (non è un segreto e non si può revocare).

## 2026-11-03 — Il voto utile è un booleano nullo su `Analysis`

- **Decisione:** la colonna `helpful` vale `true` (utile), `false` (non utile) o `null` (nessun voto). `PUT /api/analyses/:id/feedback` accetta `{ "helpful": true | false | null }`.
- **Motivo:** un voto per analisi non richiede join né una tabella in più.
- **Scartato:** una tabella `Feedback` separata (una migrazione e un join per un solo valore) e il commento libero (testo incollato da gestire e proteggere, non richiesto).

## 2026-11-03 — Schema: SQL manuale su Neon, non ancora in produzione

- **Decisione:** su Neon va eseguito questo SQL, prima del deploy che usa le nuove colonne. In produzione non è ancora applicato.

  ```sql
  ALTER TABLE "Analysis" ADD COLUMN "helpful" BOOLEAN, ADD COLUMN "shareToken" TEXT;
  CREATE UNIQUE INDEX "Analysis_shareToken_key" ON "Analysis"("shareToken");
  ```

- **Motivo:** il progetto non ha la cartella `migrations`. `npm run prisma:migrate` esegue `prisma db push`, che farebbe la stessa modifica: usarlo solo dopo aver visto la differenza.
- **Scartato:** aggiungere ora una cartella `migrations`, un passo in più fuori da questa modifica.

## 2026-11-03 — Il report si verifica dopo l'AI, non solo con il prompt

- **Decisione:** `guardReport` alza la severità almeno al livello di un attacco riconosciuto o dell'hint `high`, e tiene solo le evidenze che compaiono nel log. Il prompt racchiude il log tra due righe di confine casuali per ogni richiesta.
- **Motivo:** un log può contenere istruzioni rivolte al modello ("ignora le regole"). La difesa non può dipendere solo dal modello, che può ubbidire.
- **Scartato:** fidarsi del solo prompt, e filtrare il log prima dell'AI, che cambierebbe il testo che l'utente ha incollato.

## 2026-11-03 — Il demo usa `hybrid`: regole prima, OpenAI per i log sconosciuti

- **Decisione:** `AI_PROVIDER=hybrid` risponde con le regole quando un log è riconosciuto, e chiama OpenAI solo per il resto. Sostituisce la voce del 2026-11-01 sul demo.
- **Motivo:** i log comuni restano gratuiti e deterministici, mentre i casi non coperti dalle regole ricevono una spiegazione vera invece del fallback.
- **Scartato:** OpenAI per ogni log (costo sempre attivo) e il solo fallback a regole (risposte generiche sui casi nuovi).

## 2026-11-03 — Il limite conta anche i tentativi falliti

- **Decisione:** ogni richiesta valida viene registrata come tentativo prima della chiamata AI, in una tabella `AnalysisAttempt`. Le richieste rifiutate vengono rimosse dal conteggio.
- **Motivo:** prima una chiamata fallita non consumava il limite, quindi poteva essere ripetuta senza fine a spese di OpenAI.
- **Scartato:** contare solo le analisi riuscite, e un contatore in memoria (su Vercel non è condiviso tra istanze).

## 2026-11-02 — Il seed riempie solo una tabella vuota

- **Decisione:** `prisma:migrate` crea solo le tabelle. Il seed (`db:seed`) aggiunge esempi solo se la tabella è vuota.
- **Motivo:** prima il seed cancellava tutte le analisi, e la guida lo indicava per il database di produzione.
- **Scartato:** tenere il seed nel migrate con un avviso.

## 2026-11-02 — Richieste senza identificativo visitatore vengono rifiutate

- **Decisione:** le route `/api/analyses` rispondono 400 se manca `X-Visitor-Id`.
- **Motivo:** senza identificativo le righe finivano nel gruppo condiviso "senza proprietario".
- **Scartato:** restituire una lista vuota senza errore, che nasconde il problema.

## 2026-11-01 — Motore di analisi a regole come predefinito del demo

- **Decisione:** il demo usa `AI_PROVIDER=rules`: un elenco ordinato di regole, senza chiave API.
- **Motivo:** nessun costo e nessuna chiave da esporre, risultati deterministici e testabili.
- **Scartato:** OpenAI sul demo pubblico (costo e chiave da proteggere); resta disponibile con `AI_PROVIDER=openai`.

## 2026-11-01 — Cronologia per visitatore

- **Decisione:** ogni visitatore ha un identificativo casuale salvato nel browser; vede solo le proprie analisi.
- **Motivo:** la cronologia pubblica mostrava i log incollati da altre persone.
- **Scartato:** account con login, troppo per un demo.

## 2026-11-01 — Database Neon tramite Vercel

- **Decisione:** PostgreSQL su Neon, collegato dall'integrazione Vercel.
- **Motivo:** piano gratuito, nessun servizio da gestire a parte.
- **Scartato:** Supabase, che richiede un progetto separato.

## 2026-11-01 — Aspetto stampato su carta, senza gradienti

- **Decisione:** carta verde a righe, inchiostro, pennarello. Nessun gradiente né vetro sfocato.
- **Motivo:** le versioni con sfondo bianco o effetti da template sembravano generate dall'AI.
- **Scartato:** tema scuro con accenti neon.

## 2026-11-02 — Eccezioni alle regole di qualità

- **Funzioni sopra 20 righe:** i componenti JSX con molte righe di markup restano tra 21 e 33 righe. Spezzarli oltre questo punto renderebbe più difficile seguire la struttura della pagina. La logica resta sotto 20 righe.
- **`errorHandler` con 4 parametri:** Express riconosce un middleware di errore solo se ha esattamente quattro argomenti.
- **`console.log` di avvio:** è il messaggio "server running" in `server/src/index.ts`, utile in locale.
- **Testi di errore del server:** restano nel codice, perché compaiono solo come messaggi di risposta, non come testo dell'interfaccia.

## 2026-11-03 — Eccezioni aggiuntive

- **`req` e `res` nei gestori Express:** sono i nomi del framework, lo stesso vale per i parametri dei middleware.
- **`console.log` e `console.error` in `server/prisma/seed.ts`, `server/scripts/build-vercel.mjs` e `server/src/middleware/errorHandler.ts`:** i primi due sono script da riga di comando, il terzo registra gli errori inattesi.

- 2026-11-03 — Client: `vitest` come devDependency (la stessa versione del server) per i test unitari di `anonymize.ts`; Playwright resta solo per `client/e2e/`, e `vitest.config.ts` cerca solo `src/**/*.test.ts`.
