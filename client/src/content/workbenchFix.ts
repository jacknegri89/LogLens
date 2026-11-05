import { defineText } from '../i18n/defineText';

/** Text of the Workbench "Fix" view: code patch, regression test, alert rule and runbook. */
export const FIX_TEXT = defineText({
  en: {
    unavailable: 'The Fix tools are not available yet.',
    gate: {
      title: 'Analyze the log first',
      body: 'The fix, the test, the alert rule and the runbook are built from the analysis of your log. Run the analysis to unlock them.',
      action: 'Analyze this log',
      running: 'Analyzing',
      noLog: 'Load a log in the Explorer first.',
    },
    sections: {
      label: 'Fix tools',
      remediation: 'Code fix',
      tests: 'Regression test',
      alerts: 'Alert rule',
      runbook: 'Runbook',
    },
    copy: { copy: 'Copy', copied: 'Copied' },
    languages: {
      node: 'Node.js / TypeScript',
      python: 'Python',
      java: 'Java',
      go: 'Go',
      php: 'PHP',
      ruby: 'Ruby',
      csharp: 'C#',
      rust: 'Rust',
    },
    scenarios: {
      'database-connection-refused': {
        title: 'Database connection refused',
        description:
          'The app cannot reach the database, often right after a restart. Retry with backoff and set explicit pool timeouts.',
      },
      'connection-pool-exhausted': {
        title: 'Connection pool exhausted',
        description:
          'Connections are taken and never given back. Release them in a finally block and size the pool.',
      },
      'sql-injection': {
        title: 'SQL injection',
        description:
          'User input is glued into a query. Use a parameterized query so the value never becomes SQL.',
      },
      'null-access': {
        title: 'Null or undefined access',
        description:
          'A value is missing and the code reads a field of it. Guard the access and give a default.',
      },
      'unhandled-rejection': {
        title: 'Unhandled rejection or uncaught exception',
        description:
          'An error escapes every handler and kills a task or the process. Catch it where it can be reported.',
      },
      'outbound-timeout': {
        title: 'Outbound request timeout',
        description:
          'A call to another service waits too long. Set an explicit timeout and retry a few times.',
      },
      'rate-limit-429': {
        title: 'Rate limit (HTTP 429)',
        description:
          'The other side says "too many requests". Wait for Retry-After and back off with jitter.',
      },
      'out-of-memory': {
        title: 'Out of memory',
        description:
          'A whole file or result set is loaded at once. Stream it one piece at a time and cap the input.',
      },
      'expired-certificate': {
        title: 'Expired TLS certificate',
        description:
          'The certificate ran out or was renewed but never reloaded. Check the expiry and reload on renewal.',
      },
      'cors-blocked': {
        title: 'CORS blocked request',
        description:
          'The browser refuses a cross-origin call. Answer only to origins from an allowlist.',
      },
      'missing-environment-variable': {
        title: 'Missing environment variable',
        description:
          'A setting is absent and the failure shows up far from the cause. Validate the configuration at startup.',
      },
      'json-parse-error': {
        title: 'JSON parse error',
        description:
          'A bad body throws deep inside the handler. Validate before parsing and answer 400.',
      },
      'path-traversal': {
        title: 'Path traversal',
        description:
          'A file name like ../../etc/passwd leaves the folder. Resolve the path and check it stays inside.',
      },
      'brute-force-login': {
        title: 'Brute-force login',
        description:
          'Unlimited password guesses. Count failures per account and per address, then lock for a while.',
      },
      'file-descriptor-leak': {
        title: 'File descriptor leak',
        description:
          'Files or sockets are opened and never closed. Close them on every path with finally or using.',
      },
    },
    remediation: {
      intro:
        'A before-and-after example for the problem your analysis points to. Adapt names and imports to your project.',
      scenarioLabel: 'Problem',
      languageLabel: 'Language',
      matched: 'Chosen from your analysis.',
      notMatched:
        'Nothing in the analysis points to one of these problems. Pick the one that fits.',
      detected: 'Language detected in the log: {language}.',
      fallback: 'There is no {wanted} example for this problem, so {shown} is shown.',
      viewLabel: 'Patch view',
      sideBySide: 'Side by side',
      unified: 'Unified diff',
      before: 'Before',
      after: 'After',
      legend: 'Lines marked - are removed, lines marked + are added.',
      copyPatch: 'Copy patch',
      copyDiff: 'Copy diff',
      note: 'Examples to adapt, not a ready patch: check them against your own code and tests.',
    },
    tests: {
      intro:
        'A regression test for the same problem: it fails on the old behaviour and passes on the fix. Change the import paths to match your project.',
      frameworkLabel: 'Test framework',
      frameworks: {
        jest: 'Jest or Vitest (TypeScript)',
        pytest: 'Pytest (Python)',
        junit5: 'JUnit 5 (Java)',
      },
      codeTitle: 'Regression test',
      copy: 'Copy test',
    },
    alerts: {
      intro:
        'Turn the problem into a rule that warns you when it comes back. Pick your tool, then adjust the text and the numbers.',
      targetLabel: 'Monitoring tool',
      targets: {
        prometheus: 'Prometheus Alertmanager',
        datadog: 'Datadog log monitor',
        loki: 'Grafana Loki ruler',
        sentry: 'Sentry issue alert',
        cron: 'Bash script for cron',
      },
      targetHints: {
        prometheus: 'Alerting rule in YAML on a counter fed by your log exporter.',
        datadog: 'JSON for the monitors API, with a log query and thresholds.',
        loki: 'Ruler rule in YAML with a LogQL count over the window.',
        sentry: 'JSON for the issue alert rules API of a project.',
        cron: 'Counts the new matching lines and calls a webhook.',
      },
      fileNames: {
        prometheus: 'alert-rules.yml',
        datadog: 'monitor.json',
        loki: 'loki-rules.yml',
        sentry: 'sentry-rule.json',
        cron: 'loglens-alert.sh',
      },
      patternLabel: 'Text to look for',
      patternHelp:
        'Taken from the analysis. Quotes and symbols are escaped for the format. At most {max} characters.',
      patternEmpty: 'Type the text that the log lines contain.',
      thresholdLabel: 'Alert above (matches)',
      windowLabel: 'Window (minutes)',
      appLabel: 'Value of the app label',
      fileLabel: 'Log file path',
      resultLabel: 'Generated rule',
      copy: 'Copy rule',
    },
    runbook: {
      intro:
        'The debug steps of the report as a checklist. Commands in a step can be copied one by one.',
      progressLabel: 'Runbook progress',
      progressText: '{done} of {total} steps done',
      reset: 'Start over',
      stepsLabel: 'Debug steps',
      commandsLabel: 'Commands of this step',
      copyCommand: 'Copy command',
      completed: 'Every step is done. If the problem is still there, analyze fresh logs again.',
      empty: 'The analysis has no debug steps for this log.',
      saved: 'Your progress is saved in this browser for this analysis.',
      notSaved: 'This browser blocks storage, so progress lasts only until you leave the page.',
    },
  },
  it: {
    unavailable: 'Gli strumenti di correzione non sono ancora disponibili.',
    gate: {
      title: 'Prima analizza il log',
      body: 'La correzione, il test, la regola di allarme e il runbook nascono dall’analisi del tuo log. Avvia l’analisi per sbloccarli.',
      action: 'Analizza questo log',
      running: 'Analisi in corso',
      noLog: 'Prima carica un log nell’Esplora.',
    },
    sections: {
      label: 'Strumenti di correzione',
      remediation: 'Correzione del codice',
      tests: 'Test di regressione',
      alerts: 'Regola di allarme',
      runbook: 'Runbook',
    },
    copy: { copy: 'Copia', copied: 'Copiato' },
    languages: {
      node: 'Node.js / TypeScript',
      python: 'Python',
      java: 'Java',
      go: 'Go',
      php: 'PHP',
      ruby: 'Ruby',
      csharp: 'C#',
      rust: 'Rust',
    },
    scenarios: {
      'database-connection-refused': {
        title: 'Connessione al database rifiutata',
        description:
          'L’app non raggiunge il database, spesso subito dopo un riavvio. Riprova con attesa crescente e imposta timeout espliciti sul pool.',
      },
      'connection-pool-exhausted': {
        title: 'Pool di connessioni esaurito',
        description:
          'Le connessioni vengono prese e mai restituite. Rilasciale in un blocco finally e dimensiona il pool.',
      },
      'sql-injection': {
        title: 'SQL injection',
        description:
          'L’input dell’utente è incollato nella query. Usa una query parametrizzata: il valore non diventa mai SQL.',
      },
      'null-access': {
        title: 'Accesso a valore nullo o undefined',
        description:
          'Un valore manca e il codice ne legge un campo. Proteggi l’accesso e prevedi un valore di ripiego.',
      },
      'unhandled-rejection': {
        title: 'Rifiuto non gestito o eccezione non catturata',
        description:
          'Un errore sfugge a ogni gestore e ferma un’attività o il processo. Catturalo dove può essere segnalato.',
      },
      'outbound-timeout': {
        title: 'Timeout di una richiesta in uscita',
        description:
          'Una chiamata a un altro servizio aspetta troppo. Imposta un timeout esplicito e riprova poche volte.',
      },
      'rate-limit-429': {
        title: 'Limite di richieste (HTTP 429)',
        description:
          'L’altra parte risponde “troppe richieste”. Aspetta il Retry-After e rallenta con un po’ di casualità.',
      },
      'out-of-memory': {
        title: 'Memoria esaurita',
        description:
          'Un intero file o risultato viene caricato in una volta. Leggilo a pezzi e limita la dimensione in ingresso.',
      },
      'expired-certificate': {
        title: 'Certificato TLS scaduto',
        description:
          'Il certificato è scaduto o è stato rinnovato ma mai ricaricato. Controlla la scadenza e ricarica dopo il rinnovo.',
      },
      'cors-blocked': {
        title: 'Richiesta bloccata da CORS',
        description:
          'Il browser rifiuta una chiamata tra origini diverse. Rispondi solo alle origini di un elenco consentito.',
      },
      'missing-environment-variable': {
        title: 'Variabile d’ambiente mancante',
        description:
          'Un’impostazione manca e l’errore compare lontano dalla causa. Valida la configurazione all’avvio.',
      },
      'json-parse-error': {
        title: 'Errore di lettura JSON',
        description:
          'Un corpo non valido fa fallire il gestore in profondità. Valida prima di leggere e rispondi 400.',
      },
      'path-traversal': {
        title: 'Path traversal',
        description:
          'Un nome come ../../etc/passwd esce dalla cartella. Risolvi il percorso e verifica che resti all’interno.',
      },
      'brute-force-login': {
        title: 'Accessi a forza bruta',
        description:
          'Tentativi di password illimitati. Conta gli errori per account e per indirizzo, poi blocca per un po’.',
      },
      'file-descriptor-leak': {
        title: 'Perdita di file descriptor',
        description:
          'File o socket vengono aperti e mai chiusi. Chiudili su ogni percorso con finally o using.',
      },
    },
    remediation: {
      intro:
        'Un esempio prima e dopo per il problema indicato dalla tua analisi. Adatta nomi e import al tuo progetto.',
      scenarioLabel: 'Problema',
      languageLabel: 'Linguaggio',
      matched: 'Scelto in base alla tua analisi.',
      notMatched:
        'Nell’analisi niente indica uno di questi problemi. Scegli quello che ti sembra giusto.',
      detected: 'Linguaggio riconosciuto nel log: {language}.',
      fallback: 'Per questo problema non c’è un esempio in {wanted}, quindi vedi {shown}.',
      viewLabel: 'Vista della modifica',
      sideBySide: 'Affiancata',
      unified: 'Diff unificato',
      before: 'Prima',
      after: 'Dopo',
      legend: 'Le righe con - vengono rimosse, quelle con + vengono aggiunte.',
      copyPatch: 'Copia la modifica',
      copyDiff: 'Copia il diff',
      note: 'Sono esempi da adattare, non una patch pronta: controllali sul tuo codice e con i tuoi test.',
    },
    tests: {
      intro:
        'Un test di regressione per lo stesso problema: fallisce sul comportamento vecchio e passa con la correzione. Cambia i percorsi di import secondo il tuo progetto.',
      frameworkLabel: 'Framework di test',
      frameworks: {
        jest: 'Jest o Vitest (TypeScript)',
        pytest: 'Pytest (Python)',
        junit5: 'JUnit 5 (Java)',
      },
      codeTitle: 'Test di regressione',
      copy: 'Copia il test',
    },
    alerts: {
      intro:
        'Trasforma il problema in una regola che ti avvisa quando torna. Scegli lo strumento, poi regola il testo e i numeri.',
      targetLabel: 'Strumento di monitoraggio',
      targets: {
        prometheus: 'Prometheus Alertmanager',
        datadog: 'Monitor di log Datadog',
        loki: 'Ruler di Grafana Loki',
        sentry: 'Avviso Sentry sui problemi',
        cron: 'Script Bash per cron',
      },
      targetHints: {
        prometheus:
          'Regola di allarme in YAML su un contatore alimentato dal tuo esportatore di log.',
        datadog: 'JSON per l’API dei monitor, con query sui log e soglie.',
        loki: 'Regola del ruler in YAML con un conteggio LogQL sulla finestra.',
        sentry: 'JSON per l’API delle regole di avviso di un progetto.',
        cron: 'Conta le nuove righe che corrispondono e chiama un webhook.',
      },
      fileNames: {
        prometheus: 'alert-rules.yml',
        datadog: 'monitor.json',
        loki: 'loki-rules.yml',
        sentry: 'sentry-rule.json',
        cron: 'loglens-alert.sh',
      },
      patternLabel: 'Testo da cercare',
      patternHelp:
        'Preso dall’analisi. Virgolette e simboli sono protetti per il formato. Al massimo {max} caratteri.',
      patternEmpty: 'Scrivi il testo che compare nelle righe del log.',
      thresholdLabel: 'Allarme sopra (occorrenze)',
      windowLabel: 'Finestra (minuti)',
      appLabel: 'Valore dell’etichetta app',
      fileLabel: 'Percorso del file di log',
      resultLabel: 'Regola generata',
      copy: 'Copia la regola',
    },
    runbook: {
      intro:
        'I passaggi di debug del rapporto come lista di controllo. I comandi di un passaggio si copiano uno per uno.',
      progressLabel: 'Avanzamento del runbook',
      progressText: '{done} passaggi su {total} completati',
      reset: 'Ricomincia',
      stepsLabel: 'Passaggi di debug',
      commandsLabel: 'Comandi di questo passaggio',
      copyCommand: 'Copia il comando',
      completed:
        'Tutti i passaggi sono completati. Se il problema c’è ancora, analizza di nuovo dei log aggiornati.',
      empty: 'L’analisi non ha passaggi di debug per questo log.',
      saved: 'L’avanzamento è salvato in questo browser per questa analisi.',
      notSaved:
        'Questo browser blocca la memoria locale: l’avanzamento dura finché non lasci la pagina.',
    },
  },
});

export type FixText = (typeof FIX_TEXT)['en'];
