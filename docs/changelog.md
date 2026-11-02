# Changelog

Modifiche approvate, dalla più recente.

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
