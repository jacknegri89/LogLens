# Decisioni

Ogni voce: data, decisione, motivo, alternative scartate.

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
