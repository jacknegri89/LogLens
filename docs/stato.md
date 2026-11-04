# Stato dei task

| Stato   | Task                                                                                                           |
| ------- | -------------------------------------------------------------------------------------------------------------- |
| Fatto   | Controlli di qualità: Prettier, funzioni brevi, testi in file di contenuto                                     |
| Fatto   | Documentazione richiesta dalle regole (changelog, decisioni, backlog, stato)                                   |
| Fatto   | Correzione del seed che cancellava la cronologia                                                               |
| Fatto   | 21 nuove regole, parser dei livelli syslog, verifica del report contro il log                                  |
| Fatto   | Feedback utile e link di condivisione, con interfaccia                                                         |
| Fatto   | Workbench allineato allo stile del sito, verificato su telefono e desktop                                      |
| Fatto   | Pagina privacy e cookie, con titolare, contatto, regione del database (AWS US East 1) e addendum dei fornitori |
| Fatto   | Cancellazione automatica delle analisi dopo 90 giorni, con Vercel Cron giornaliero                             |
| Fatto   | Tentativi di analisi con hash dell'indirizzo cancellati dopo un'ora; `VISITOR_SALT` impostato in produzione    |
| Fatto   | Test end-to-end e test client nella CI                                                                         |
| Da fare | Impostare `CRON_SECRET` su Vercel (Production), altrimenti la pulizia programmata non parte                    |
| Da fare | Verificare su Neon che le colonne `helpful` e `shareToken` esistano (lo SQL era da applicare prima del deploy) |
| Da fare | Parere legale ricevuto e accettato: nessun punto aperto sulla privacy                                          |
| Da fare | Checklist PASS/FAIL su telefono e desktop (vedi `docs/checklist.md`), da rifare dopo le modifiche di oggi      |
