# Decisioni

Ogni voce: data, decisione, motivo, alternative scartate.

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

- **Funzioni sopra 20 righe:** i componenti JSX con molte righe di markup restano tra 21 e 33 righe. Spezzarli oltre questo punto renderebbe più difficile seguire la struttura della pagina. La logica resta sotto 20 righe, salvo `useAnalysis` (30).
- **`errorHandler` con 4 parametri:** Express riconosce un middleware di errore solo se ha esattamente quattro argomenti.
- **`console.log` di avvio:** è il messaggio "server running" in `server/src/index.ts`, utile in locale.
- **Testi di errore del server:** restano nel codice, perché compaiono solo come messaggi di risposta, non come testo dell'interfaccia.
