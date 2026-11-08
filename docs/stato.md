# Stato dei task

| Stato   | Task                                                                                                                                                   |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fatto   | Controlli di qualità: Prettier, funzioni brevi, testi in file di contenuto                                                                             |
| Fatto   | Documentazione richiesta dalle regole (changelog, decisioni, backlog, stato)                                                                           |
| Fatto   | Correzione del seed che cancellava la cronologia                                                                                                       |
| Fatto   | 21 nuove regole, parser dei livelli syslog, verifica del report contro il log                                                                          |
| Fatto   | Feedback utile e link di condivisione, con interfaccia                                                                                                 |
| Fatto   | Workbench allineato allo stile del sito, verificato su telefono e desktop                                                                              |
| Fatto   | Pagina privacy e cookie, con titolare, contatto, regione del database (AWS US East 1) e addendum dei fornitori                                         |
| Fatto   | Cancellazione automatica delle analisi dopo 90 giorni, con Vercel Cron giornaliero                                                                     |
| Fatto   | Tentativi di analisi con hash dell'indirizzo cancellati dopo un'ora; `VISITOR_SALT` impostato in produzione                                            |
| Fatto   | Test end-to-end e test client nella CI                                                                                                                 |
| Fatto   | `CRON_SECRET` impostato su Vercel e cron giornaliero attivo                                                                                            |
| Fatto   | Colonne `helpful` e `shareToken` verificate in produzione con una prova completa                                                                       |
| Fatto   | Parere legale sulla pagina privacy ricevuto e accettato                                                                                                |
| Fatto   | Prisma 7, `npm audit` a zero, intestazioni di sicurezza, limite di richieste per minuto                                                                |
| Fatto   | Regole di sintassi del CLAUDE.md applicate a tutto il repository (controllo sull'albero sintattico)                                                    |
| Fatto   | README in inglese con copia italiana, schermate aggiornate, titoli e descrizioni per pagina, Open Graph, sitemap                                       |
| Da fare | Attivare le schede Correzione e Chiedi: rivedere prima il generatore di alert cron (pianificazione oltre 59 minuti, cartella HOME) e la CSP per Ollama |
| Da fare | Rimisurare funzioni sotto circa 20 righe e duplicazioni (voci 3 e 4 della checklist)                                                                   |
