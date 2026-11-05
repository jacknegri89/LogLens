/**
 * Italian text of every rule in `rules.ts`, keyed by the rule id. The patterns, categories and
 * severities are not repeated here: they stay in English in `rules.ts`. Commands, configuration
 * keys and technical terms are copied as they are.
 */
import type { LogDetails } from './logDetails';
import type { RuleId, RuleText } from './rules';

const FAILING_LINE = 'la riga di log che segnala il guasto';

const CLIENT_ERROR_MEANING: Record<string, string> = {
  '400': 'la richiesta è malformata o ha parametri non validi.',
  '404': 'il percorso non esiste su questo server.',
  '405': 'il metodo HTTP (GET, POST, ...) non è consentito su questo percorso.',
  '408': 'il client ha impiegato troppo tempo a inviare la richiesta.',
  '413': 'il corpo della richiesta è più grande di quanto il server accetti.',
};

/** The names of the line fields that `extractLineFieldEntries` reads, as an Italian reader expects them. */
const LINE_FIELD_LABEL: Record<string, string> = {
  time: 'ora',
  level: 'livello',
  address: 'indirizzo',
  'hex code': 'codice esadecimale',
  'event id': 'id evento',
};

function describeLineFields({ failureLineFields }: LogDetails): string {
  const fields = failureLineFields.map(
    ({ label, value }) => `${LINE_FIELD_LABEL[label] ?? label} ${value}`,
  );
  if (fields.length > 0) {
    return ` Letti dalla riga: ${fields.join('; ')}.`;
  }
  return '';
}

export const RULE_TEXT_IT: Record<RuleId, RuleText> = {
  'injection-attack': {
    causes: [
      'Uno strumento di attacco automatico o uno scanner ha inviato payload di injection (SQL, XSS o path traversal) nella richiesta.',
      "Il payload è arrivato alla logica dell'applicazione senza essere respinto o neutralizzato, quindi il server è andato in errore mentre lo elaborava.",
    ],
    debugSteps: [
      "Blocca l'IP sorgente sul firewall o sul WAF (per esempio: iptables -A INPUT -s <IP> -j DROP) e aggiungi una regola WAF per questo payload.",
      'Sostituisci la concatenazione di stringhe nella query con una prepared statement, per esempio db.query("SELECT * FROM products WHERE id = $1", [id]).',
      "Controlla i log del database e dell'applicazione nella stessa finestra temporale per capire se sono stati restituiti dati.",
      "Restituisci al client un errore generico e registra i dettagli solo sul server, così nessun errore SQL arriva all'attaccante.",
    ],
  },
  'postgres-password-failed': {
    causes: [],
    causesFor: ({ postgresUser }) => {
      const user = postgresUser ?? "l'utente configurato";
      return [
        `Credenziali errate per l'utente ${user} su PostgreSQL: il server ha rifiutato la password (FATAL: password authentication failed).`,
        'Poiché il login fallisce, il pool di connessioni non riesce ad aprire nessuna connessione e le richieste che usano il database vanno in errore.',
      ];
    },
    debugSteps: [
      "Confronta utente e password in DATABASE_URL (o nell'URL JDBC) con le credenziali reali del ruolo del database.",
      'Prova le stesse credenziali a mano: psql -h <host> -U <user> -d <database>.',
      "Se la password è cambiata, aggiorna il segreto letto dall'app oppure reimpostala sul server: ALTER USER <user> WITH PASSWORD '...';",
      "Verifica che l'app legga il segreto dall'ambiente o dal secret store, non da un vecchio file o da un valore in cache.",
    ],
  },
  'image-pull-or-crash-loop': {
    causes: [
      "L'immagine del container non può essere scaricata: nome o tag sbagliati, oppure manca l'accesso al registry.",
      'Il container parte e va subito in crash, quindi Kubernetes continua a riavviarlo.',
    ],
    debugSteps: [
      'Esegui kubectl describe pod e leggi la sezione Events in fondo.',
      "Controlla il nome e il tag dell'immagine e che il cluster abbia le credenziali per il registry.",
      "Per un crash loop, leggi i log dell'esecuzione precedente (kubectl logs --previous).",
    ],
  },
  'dns-resolution': {
    causes: [
      'Il nome host non si risolve: è scritto male oppure il server DNS non lo conosce.',
      'La macchina o il container non ha accesso a internet oppure usa un server DNS sbagliato.',
    ],
    debugSteps: [
      "Controlla che il nome host non abbia errori di battitura nella configurazione o nell'URL.",
      'Risolvi il nome a mano dalla stessa macchina (nslookup, ping).',
      'Controlla le impostazioni DNS e proxy della macchina o del container.',
    ],
  },
  'disk-full': {
    causes: [
      "Il disco o la partizione su cui scrive l'app è pieno.",
      'Log, cache o file temporanei sono cresciuti senza alcun limite.',
    ],
    debugSteps: [
      'Controlla lo spazio libero (df -h) e individua cosa lo occupa (du -sh sulle cartelle più grandi).',
      'Elimina i vecchi log e i file temporanei e configura la rotazione dei log.',
      'Sposta i dati su un volume più grande se la crescita è prevista.',
    ],
  },
  'certificate-verification': {
    causes: [
      "Il certificato è scaduto, autofirmato o non emesso da un'autorità di cui il client si fida.",
      'Il server non invia la catena completa dei certificati.',
    ],
    debugSteps: [
      "Apri l'indirizzo in un browser e controlla il certificato e la sua data di scadenza.",
      "Installa la catena completa sul server oppure aggiungi la tua autorità all'elenco di fiducia del client.",
      'Non disattivare i controlli sul certificato in produzione: correggi il certificato.',
    ],
  },
  'cors-blocked': {
    causes: [
      "L'API non consente l'origine della pagina che la chiama.",
      'La risposta alla richiesta preflight (OPTIONS) non contiene gli header CORS.',
    ],
    debugSteps: [
      "Consenti l'origine esatta del frontend nelle impostazioni CORS dell'API.",
      "In sviluppo, fai passare l'API dal proxy del dev server, così il browser vede una sola origine.",
      'Controlla nel tab Network del browser che la richiesta OPTIONS restituisca gli header di autorizzazione.',
    ],
  },
  'hydration-mismatch': {
    causes: [
      "L'HTML renderizzato sul server è diverso da quello che il browser renderizza per primo.",
      'Il codice usa valori che cambiano tra i due, come date, numeri casuali o window.',
    ],
    debugSteps: [
      'Trova il componente indicato nel messaggio e cerca date, valori casuali o controlli che esistono solo nel browser.',
      'Sposta quel codice in un effect che gira solo nel browser.',
    ],
  },
  'java-null-pointer': {
    causes: [
      'Un riferimento è null alla riga indicata nello stack trace.',
      'Un metodo ha restituito null e il risultato è stato usato senza controllarlo.',
    ],
    debugSteps: [
      'Apri la prima riga dello stack trace che appartiene al tuo codice.',
      'Individua quale riferimento su quella riga è null e dove avrebbe dovuto essere impostato.',
      "Controllalo prima dell'uso, oppure fai restituire al metodo un valore vuoto invece di null.",
    ],
  },
  'database-unreachable': {
    causes: [
      "Il servizio a cui ti connetti non è in esecuzione, oppure non è ancora pronto quando l'app parte.",
      'Host o porta sono sbagliati. Dentro Docker, "localhost" è il container stesso, non l\'altro servizio.',
      'Un firewall o una network policy blocca la connessione.',
    ],
    debugSteps: [
      'Verifica che il servizio di destinazione sia in esecuzione e in ascolto sulla porta prevista.',
      'Confronta host e porta nella configurazione (per esempio DATABASE_URL) con quelli reali.',
      'Prova a connetterti a mano dalla stessa macchina o dallo stesso container (psql, nc, curl).',
      "In Docker Compose, usa il nome del servizio come host e attendi lo stato healthy prima di avviare l'app.",
    ],
  },
  'connection-refused': {
    causes: [
      "Nessun processo è in ascolto su quell'indirizzo e porta: il servizio è giù oppure non è ancora pronto.",
      'L\'indirizzo è sbagliato. Dentro Docker, "localhost" è il container stesso, non un altro servizio.',
    ],
    debugSteps: [
      'Verifica che il servizio di destinazione sia in esecuzione e in ascolto sulla porta prevista.',
      'Confronta host e porta nella configurazione con quelli reali.',
      'Prova la connessione a mano dalla stessa macchina o dallo stesso container (curl, nc).',
    ],
  },
  'port-in-use': {
    causes: [
      'Un altro processo è già in ascolto sulla stessa porta, spesso una esecuzione precedente che non si è fermata.',
      'Due servizi della stessa configurazione usano la stessa porta.',
    ],
    debugSteps: [
      'Trova il processo che occupa la porta (lsof -i :PORT su macOS e Linux, netstat -ano su Windows).',
      "Ferma quel processo, oppure avvia questa app su un'altra porta.",
      'Controlla che la porta non sia definita due volte nella configurazione o nel file compose.',
    ],
  },
  'out-of-memory': {
    causes: [
      'Il processo ha superato il limite di memoria ed è stato terminato.',
      'Un memory leak: oggetti che non vengono mai rilasciati continuano a crescere.',
      'Una singola richiesta carica troppi dati in memoria in una volta sola.',
    ],
    debugSteps: [
      "Controlla il limite di memoria del container o della macchina e quanto l'app vi si avvicina.",
      'Fai un heap snapshot o osserva la memoria nel tempo per capire cosa cresce.',
      'Elabora i dati grandi a blocchi o in streaming invece di caricarli tutti insieme.',
      "Alza il limite solo dopo aver capito che l'app ne ha davvero bisogno (per Node: --max-old-space-size).",
    ],
  },
  'null-property-access': {
    causes: [
      'Un valore che dovrebbe esistere è undefined o null a questo punto.',
      "Una funzione ha ricevuto dati con una forma diversa da quella attesa, spesso un risultato vuoto di un'API o di un database.",
      'Una chiamata avviene prima che i dati siano stati caricati.',
    ],
    debugSteps: [
      'Apri il primo frame dello stack che appartiene al tuo codice e guarda la variabile su quella riga.',
      'Registra il valore subito prima della riga che fallisce per vedere cosa contiene davvero.',
      "Controlla o valida l'input prima di usarlo e decidi cosa succede quando manca.",
    ],
  },
  'type-error': {
    causes: [],
    causesFor: ({ typeErrorMessage }) => [
      `Una chiamata ha ricevuto un valore del tipo sbagliato: ${typeErrorMessage ?? 'un valore del tipo sbagliato'}.`,
      'Il valore arriva da un input o da dati di cui il codice non controlla il tipo prima di usarli.',
    ],
    debugSteps: [
      "Apri il file e la riga indicati nel messaggio o nell'ultimo frame dello stack.",
      'Stampa il tipo del valore passato lì (typeof, type() o gettype()) subito prima della chiamata.',
      "Converti o valida l'input nel punto in cui entra nel codice e rifiuta un tipo errato con un errore chiaro.",
    ],
  },
  'index-error': {
    causes: [],
    causesFor: ({ lastFrame }) => [
      `Un indice viene letto oltre la fine di una sequenza in ${lastFrame ?? FAILING_LINE}: la lista, la stringa o la tupla è più corta di quanto il codice si aspetta.`,
      "La sorgente dei dati ha restituito meno elementi del previsto, spesso una query o un'API con risultato vuoto.",
    ],
    debugSteps: [
      "Apri il file e la riga indicati nell'ultimo frame del traceback e guarda l'indice usato lì.",
      'Stampa len() di quella sequenza subito prima della riga che fallisce per vederne la dimensione reale.',
      'Controlla la lunghezza prima di indicizzare (per esempio if items:) o usa un valore predefinito, e decidi cosa riceve il chiamante quando i dati sono vuoti.',
    ],
  },
  'duplicate-key': {
    causes: [
      'Il codice inserisce una riga con un valore univoco che esiste già.',
      'Due richieste inseriscono lo stesso valore nello stesso momento (una race condition).',
    ],
    debugSteps: [
      'Guarda il nome del vincolo nel messaggio per trovare la colonna che deve essere univoca.',
      'Controlla prima se la riga esiste già, oppure usa un upsert (insert o update).',
      "Gestisci questo errore in modo esplicito e restituisci un messaggio chiaro all'utente.",
    ],
  },
  'not-null-violation': {
    causes: [],
    causesFor: ({ nullColumn }) => [
      `L'INSERT o l'UPDATE scrive NULL in ${nullColumn ?? 'una colonna obbligatoria'}, ma la tabella non lo consente.`,
      "Il codice costruisce la riga senza un valore per questo campo, spesso perché l'input mancava o un passaggio precedente è fallito.",
    ],
    debugSteps: [
      'Trova il codice che costruisce la riga e verifica che ogni colonna NOT NULL riceva un valore.',
      "Valida i campi obbligatori prima dell'insert e restituisci un errore chiaro quando ne manca uno.",
      'Confronta la definizione della tabella (\\d <table> in psql) con i campi che il codice invia.',
    ],
  },
  timeout: {
    causes: [
      'Il servizio remoto è lento o irraggiungibile.',
      "Il timeout è più breve del tempo di cui l'operazione ha davvero bisogno.",
      'La rete tra le due macchine perde pacchetti.',
    ],
    debugSteps: [
      'Chiama il servizio remoto a mano e misura quanto impiega.',
      'Verifica se il servizio è sovraccarico o fuori servizio.',
      "Aggiungi un retry con attesa crescente e imposta un timeout adatto all'operazione reale.",
    ],
  },
  'module-not-found': {
    causes: [
      'Manca una dipendenza: non è installata o non è elencata nel file dei pacchetti.',
      'Il percorso di import è sbagliato, oppure maiuscole e minuscole differiscono dal nome reale del file.',
    ],
    debugSteps: [
      'Esegui di nuovo il comando di installazione (npm install, pip install -r requirements.txt).',
      "Verifica che il pacchetto sia nell'elenco delle dipendenze e non solo installato sulla tua macchina.",
      'Controlla il percorso di import e il nome esatto del file, maiuscole incluse.',
    ],
  },
  'permission-denied': {
    causes: [
      "L'utente che esegue il processo non può leggere, scrivere o eseguire il file o la porta.",
      'Le porte sotto la 1024 richiedono privilegi aggiuntivi su molti sistemi.',
    ],
    debugSteps: [
      'Guarda proprietario e permessi del file o della cartella indicati nel messaggio.',
      "Esegui l'app con un utente che ha accesso, oppure cambia i permessi solo su quel percorso.",
      "Usa una porta sopra la 1024 se l'errore riguarda una porta.",
    ],
  },
  'file-not-found': {
    causes: [
      'Il file o la cartella non esiste in quel percorso.',
      "Il percorso è relativo e l'app gira da una directory di lavoro diversa da quella prevista.",
    ],
    debugSteps: [
      "Stampa il percorso completo che l'app prova ad aprire e verifica che esista.",
      'Usa percorsi assoluti, oppure costruiscili a partire dalla posizione del file corrente.',
      'Assicurati che il file venga creato o copiato nel passaggio di build o di deploy.',
    ],
  },
  unauthorized: {
    causes: [
      'Le credenziali o il token mancano, sono sbagliati o sono scaduti.',
      "L'account non ha il permesso per questa operazione.",
    ],
    debugSteps: [
      "Verifica che la richiesta invii davvero il token o la chiave, e nell'header giusto.",
      'Controlla la data di scadenza e rinnovalo se serve.',
      "Controlla i permessi dell'account per questa risorsa.",
    ],
  },
  'syntax-error': {
    causes: [
      'Il testo che viene analizzato non è valido, per esempio una pagina di errore HTML letta come JSON.',
      'Un file ha un errore di battitura o un blocco non chiuso.',
    ],
    debugSteps: [
      'Stampa il testo grezzo subito prima che venga analizzato.',
      'Controlla lo status e il content type della risposta che è stata analizzata.',
      'Esegui un linter o un formatter sul file indicato nel messaggio.',
    ],
  },
  'stack-overflow': {
    causes: [
      'Una funzione richiama se stessa, direttamente o tramite altre, senza una condizione di arresto.',
      'Dati con un ciclo vengono elaborati come se fossero un albero.',
    ],
    debugSteps: [
      'Guarda i frame ripetuti nello stack trace: mostrano il ciclo.',
      'Aggiungi o correggi la condizione di arresto della ricorsione.',
      'Trasforma la ricorsione in un ciclo se la profondità può essere elevata.',
    ],
  },
  'connection-pool-exhausted': {
    causes: [
      'Ci sono troppe connessioni aperte, oppure tutte quelle del pool sono occupate: ogni richiesta o funzione ne apre una propria, oppure una query lenta le trattiene.',
      'Due transazioni si aspettano a vicenda e nessuna può proseguire.',
    ],
    debugSteps: [
      'Riusa un unico pool di connessioni condiviso invece di aprire connessioni per ogni richiesta.',
      'Sulle piattaforme serverless, collegati tramite la connection string con pooling.',
      'Tieni le transazioni brevi e blocca sempre le righe nello stesso ordine.',
    ],
  },
  'failed-login-attempts': {
    causes: [
      'Tentativi di login ripetuti con password errate o utenti inesistenti: un attacco brute force o di indovinamento delle credenziali.',
    ],
    debugSteps: [
      'Elenca gli indirizzi sorgente dei tentativi falliti (grep "Failed password" /var/log/auth.log | sort | uniq -c).',
      'Blocca gli indirizzi che si ripetono, per esempio con fail2ban o una regola del firewall.',
      'Disattiva il login con password per SSH e usa le chiavi, e verifica che nessun account abbia una password vuota.',
    ],
  },
  'bad-gateway': {
    causes: [
      "Il proxy o il load balancer non ha ricevuto una risposta valida dall'applicazione che sta dietro: l'app è giù, sovraccarica o in riavvio.",
    ],
    debugSteps: [
      "Verifica che il processo o il container dell'applicazione sia in esecuzione e in salute.",
      "Leggi il log dell'applicazione allo stesso timestamp: l'errore che ha causato il 5xx è lì.",
      "Confronta il timeout verso l'upstream del proxy con il tempo che la richiesta impiega davvero.",
    ],
  },
  'server-error': {
    causes: [
      "L'applicazione è andata in errore mentre gestiva questa richiesta e ha restituito un errore del server.",
      "La richiesta ha raggiunto codice che lancia un'eccezione o dipende da un servizio che non ha risposto.",
    ],
    debugSteps: [
      "Trova la riga di log dell'applicazione per la stessa richiesta (stesso orario e percorso) per vedere l'eccezione.",
      'Riproduci la richiesta con curl e verifica se fallisce sempre o solo a volte.',
      'Correggi il percorso di codice che fallisce e restituisci un body di errore chiaro invece di un 500 vuoto.',
    ],
  },
  'rate-limited': {
    causes: [
      'Un client ha inviato più richieste di quante il rate limit consenta, quindi il server ha rifiutato quelle in più.',
    ],
    debugSteps: [
      'Individua il client (indirizzo IP o chiave API) che invia le richieste e verifica se è atteso.',
      'Aggiungi al client un backoff con retry, oppure alza il limite solo per i client fidati.',
    ],
  },
  'unhandled-promise-rejection': {
    causes: [
      'Una Promise è stata rifiutata e nessuno ha gestito il rifiuto, quindi Node.js lo tratta come un crash.',
    ],
    debugSteps: [
      'Apri il primo frame dello stack del rifiuto e individua la chiamata async senza catch né try/await.',
      "Aggiungi un try/catch attorno a quell'await oppure un .catch() che registri e gestisca l'errore.",
    ],
  },
  'connection-reset': {
    causes: [
      "L'altra parte ha chiuso la connessione mentre una richiesta era ancora in corso: spesso un riavvio del server, un timeout o un proxy che chiude le connessioni inattive.",
    ],
    debugSteps: [
      'Verifica se il servizio remoto si è riavviato o è andato in crash nello stesso momento.',
      'Confronta il timeout del client con il timeout keep-alive del server o del proxy.',
      'Ritenta le richieste idempotenti con un breve backoff.',
    ],
  },
  'python-exception': {
    causes: [],
    causesFor: ({ lastFrame }) => [
      `L'eccezione viene sollevata in ${lastFrame ?? FAILING_LINE} e lì non è stata gestita.`,
      'Il valore a quella riga ha una chiave, un attributo o un numero che il codice non si aspetta: spesso dati mancanti o un tipo sbagliato.',
    ],
    debugSteps: [
      "Apri il file e la riga indicati nell'ultimo frame del traceback.",
      "Stampa il valore usato lì (la chiave, il proprietario dell'attributo o il divisore) subito prima della riga che fallisce.",
      "Valida l'input, oppure usa un valore predefinito, e decidi cosa riceve il chiamante quando i dati mancano.",
    ],
  },
  'segmentation-fault': {
    causes: [
      'Il processo ha acceduto a memoria che non gli appartiene: un puntatore errato, un use-after-free o una libreria nativa usata in modo scorretto.',
    ],
    debugSteps: [
      "Esegui il programma con un debugger (gdb o lldb) o con AddressSanitizer per trovare la riga che causa l'errore.",
      "Controlla le librerie native e le loro versioni, e ricompilale se l'ABI è cambiata.",
    ],
  },
  'mysql-access-denied': {
    causes: [],
    causesFor: ({ mysqlUser }) => {
      const user = mysqlUser ?? "l'utente configurato";
      return [
        `Credenziali errate per l'utente ${user} su MySQL: il server ha rifiutato il login.`,
        "Poiché il login fallisce, l'applicazione non può usare il database e le sue richieste vanno in errore.",
      ];
    },
    debugSteps: [
      "Confronta utente e password nella configurazione con le credenziali reali dell'account MySQL.",
      'Prova il login a mano: mysql -h <host> -u <user> -p.',
      "Verifica che l'account possa connettersi dall'host su cui gira l'app (la parte host del nome dell'account).",
    ],
  },
  'tls-certificate': {
    causes: [
      "Il certificato TLS è scaduto, non corrisponde al nome host, oppure è firmato da un'autorità di cui il client non si fida.",
      'Viene usato un certificato autofirmato o interno senza il corrispondente certificato CA sul client.',
    ],
    debugSteps: [
      'Controlla la data di scadenza e i nomi host del certificato: openssl s_client -connect <host>:443 -servername <host>.',
      'Rinnova il certificato, oppure installa sul server i certificati intermedi e CA mancanti.',
      'Non disattivare i controlli sul certificato nel client; aggiungi invece il certificato CA corretto.',
    ],
  },
  'redis-rejected-command': {
    causes: [
      'Redis rifiuta il comando: il client non ha fatto il login (NOAUTH), la password è sbagliata (WRONGPASS), oppure Redis ha esaurito la memoria o non riesce a salvare su disco (OOM, MISCONF).',
    ],
    debugSteps: [
      'Confronta la password di Redis nella configurazione con il valore requirepass del server.',
      'Per OOM, controlla maxmemory e la eviction policy, e libera memoria o alza il limite.',
      'Per MISCONF, controlla lo spazio su disco e i permessi della directory dati di Redis.',
    ],
  },
  'docker-daemon': {
    causes: [
      "Il demone Docker non è in esecuzione, oppure l'utente corrente non ha il permesso di accedere al suo socket.",
      'Il comando punta a un demone su un altro host tramite DOCKER_HOST.',
    ],
    debugSteps: [
      'Avvia il demone (systemctl start docker) o apri Docker Desktop, poi riprova.',
      "Aggiungi l'utente al gruppo docker, oppure esegui il comando con sudo, se il socket segnala permission denied.",
      'Controlla la variabile DOCKER_HOST e il contesto selezionato con docker context ls.',
    ],
  },
  'native-panic': {
    causes: [
      'Il programma ha incontrato una condizione che non gestisce (nil pointer, indice fuori intervallo, unwrap fallito) e si è fermato.',
    ],
    debugSteps: [
      'Leggi il primo frame dello stack che appartiene al tuo codice, non alla libreria standard.',
      "Controlla a quella riga il valore indicato nel messaggio di panic: nil, lunghezza o risultato dell'unwrap.",
      'Restituisci un errore da quel percorso invece di andare in panic e gestiscilo dove viene fatta la chiamata.',
    ],
  },
  'dotnet-exception': {
    causes: [
      "Un'eccezione .NET non è stata catturata, quindi l'applicazione è terminata. Il frame in cima mostra dove è stata lanciata.",
    ],
    debugSteps: [
      'Apri il primo frame del tuo codice nello stack trace.',
      "Controlla se l'oggetto o il valore usato lì è null o fuori intervallo.",
      "Cattura l'eccezione nel punto in grado di gestirla e registra tutti i dettagli.",
    ],
  },
  'php-fatal-error': {
    causes: [
      'PHP ha interrotto lo script per un errore non catturato o per la chiamata a codice che non esiste.',
    ],
    debugSteps: [
      'Apri il file e la riga indicati nel messaggio: PHP li stampa dopo "on line".',
      'Verifica che la funzione o la classe sia definita e che il suo file sia caricato (autoload, require).',
      'Attiva il logging degli errori in sviluppo e tieni display_errors disattivato in produzione.',
    ],
  },
  'ruby-nil-method': {
    causes: [
      'Ruby ha chiamato un metodo su nil: un valore che dovrebbe esistere manca a questo punto.',
    ],
    debugSteps: [
      'Apri il primo frame applicativo del backtrace e individua la variabile che lì è nil.',
      'Controlla dove viene impostata quella variabile e perché in questa richiesta non lo è.',
      'Proteggi la chiamata con un controllo su nil, oppure correggi la ricerca che non ha restituito nulla.',
    ],
  },
  'nginx-error': {
    causes: [
      'Il web server (nginx) è andato in errore mentre serviva la richiesta: un upstream in crash, un problema di file o permessi, oppure un limite raggiunto.',
    ],
    debugSteps: [
      "Leggi il testo dell'errore dopo il tag [error]: indica il file, il socket o l'upstream che è fallito.",
      "Verifica che l'applicazione upstream sia in esecuzione e raggiungibile dal web server.",
      'Esegui nginx -t per validare la configurazione, poi ricaricala.',
    ],
  },
  'service-failed-to-start': {
    causes: [
      "Un servizio di sistema è terminato durante l'avvio: una configurazione errata, un file mancante o una porta già in uso.",
    ],
    debugSteps: [
      'Leggi il log del servizio: journalctl -u <service> -n 100 --no-pager.',
      "Prova il comando del servizio a mano per vedere l'output completo dell'errore.",
      'Correggi la configurazione indicata nel log, poi riavvia il servizio.',
    ],
  },
  'pod-evicted': {
    causes: [
      'Kubernetes ha rimosso il pod perché il suo nodo era a corto di memoria o disco e il pod superava le sue request.',
    ],
    debugSteps: [
      "Esegui kubectl describe pod e leggi il motivo e il messaggio dell'eviction.",
      'Imposta request e limit di memoria e storage realistici per il container.',
      "Controlla l'uso del disco del nodo e pulisci le vecchie immagini e i log se il disco è pieno.",
    ],
  },
  'sqlite-locked': {
    causes: [
      "Un'altra connessione tiene un lock di scrittura sul file SQLite, di solito una transazione lunga o un secondo processo.",
    ],
    debugSteps: [
      'Trova il processo che tiene il file (lsof <file.db>) e cerca transazioni che non vengono mai confermate con commit.',
      'Tieni le transazioni brevi e imposta un busy timeout nel driver.',
      'Non condividere un unico file SQLite tra più processi che scrivono; per quel caso usa PostgreSQL.',
    ],
  },
  'missing-table-or-column': {
    causes: [],
    causesFor: ({ missingObject }) => [
      `La query usa ${missingObject ?? 'la tabella o la colonna'}, che non esiste nel database a cui l'applicazione si connette.`,
      "La migrazione che la crea non è stata eseguita lì, oppure l'app punta a un database diverso.",
    ],
    debugSteps: [
      'Verifica che le migrazioni siano state eseguite su questo database e che DATABASE_URL punti a quello giusto.',
      'Confronta lo schema di questo database con il codice (prisma migrate status, oppure il file dello schema).',
      'Controlla come è scritto il nome della tabella o della colonna nella query.',
    ],
  },
  'too-many-open-files': {
    causes: [
      'Il processo ha aperto più file o socket di quanti il sistema ne consenta, di solito perché connessioni o file handle non vengono chiusi.',
    ],
    debugSteps: [
      'Conta gli handle aperti dal processo: lsof -p <pid> | wc -l.',
      'Trova il codice che apre file o connessioni in un ciclo senza chiuderli.',
      'Alza il limite (ulimit -n) solo dopo aver confermato che gli handle vengono rilasciati.',
    ],
  },
  'host-unreachable': {
    causes: [
      "Non c'è nessun percorso di rete verso la destinazione: indirizzo sbagliato, una regola del firewall o una route mancante in questa rete.",
    ],
    debugSteps: [
      "Esegui ping e traceroute verso l'indirizzo di destinazione dalla stessa macchina.",
      'Controlla il firewall, i security group e la VPN o la rete in cui si trova la destinazione.',
      'Controlla indirizzo e porta nella configurazione.',
    ],
  },
  'connection-aborted': {
    causes: [
      "La connessione è stata interrotta durante la creazione: una versione TLS o un cipher incompatibili, un proxy nel mezzo o un server che l'ha chiusa.",
    ],
    debugSteps: [
      "Prova l'handshake TLS a mano: openssl s_client -connect <host>:<port>.",
      'Confronta le versioni TLS e i cipher supportati da client e server.',
      'Verifica se un proxy o un firewall ispeziona il traffico.',
    ],
  },
  'cloud-access-denied': {
    causes: ['Alle credenziali cloud manca il permesso per questa azione, oppure sono scadute.'],
    debugSteps: [
      "Controlla quale identità usa la richiesta (aws sts get-caller-identity o l'equivalente del tuo provider).",
      "Confronta i permessi di quell'identità con l'azione indicata nell'errore.",
      'Rinnova o ruota le credenziali scadute e non salvare chiavi di lunga durata nel codice.',
    ],
  },
  'invalid-json-body': {
    causes: [
      'Il body inviato al server non è JSON valido: un payload troncato, un apice mancante o un Content-Type sbagliato.',
    ],
    debugSteps: [
      'Stampa il body grezzo inviato dal client e validalo con un linter JSON.',
      "Verifica che l'header Content-Type sia application/json quando il body è JSON.",
      'Restituisci dal server un messaggio 400 chiaro per i body non validi.',
    ],
  },
  'unhandled-exception': {
    causes: [],
    causesFor: ({ exceptionName, lastFrame }) => [
      `L'eccezione ${exceptionName ?? '(vedi la prima riga)'} non è stata catturata e ha fermato il thread.`,
      `È stata sollevata in ${lastFrame ?? FAILING_LINE} e lì non è stata gestita.`,
    ],
    debugSteps: [
      'Leggi le righe "Caused by" in fondo: la causa più interna è il vero problema.',
      'Apri il primo frame del tuo codice e controlla il valore usato lì.',
      "Cattura l'eccezione nel punto in cui il programma può riprendersi e registra lo stack trace completo.",
    ],
  },
  'client-error': {
    causes: [],
    causesFor: ({ clientStatus }) => {
      const status = clientStatus ?? '4xx';
      return [
        `Il server ha risposto ${status}: ${CLIENT_ERROR_MEANING[status] ?? 'ha rifiutato la richiesta per come è stata costruita dal client.'}`,
        'Molte risposte di questo tipo dallo stesso indirizzo in poco tempo indicano uno scanner o un client difettoso, non un utente.',
      ];
    },
    debugSteps: [
      "Confronta il percorso e il metodo nell'access log con le route definite dall'applicazione.",
      'Cerca molte risposte 4xx dallo stesso indirizzo: è uno scanner o un client difettoso.',
      'Se il client è il tuo frontend, correggi il link o la richiesta che invia.',
    ],
  },
  fallback: {
    causes: [],
    causesFor: (details) => {
      if (details.failureLine === undefined) {
        return ["L'estratto contiene solo attività normale: nessuna riga segnala un guasto."];
      }
      return [
        `La riga che segnala il guasto è: "${details.failureLine}".${describeLineFields(details)}`,
        'Le regole non hanno una voce per questo messaggio esatto, quindi la causa è nel codice che lo scrive: cerca questo testo per trovare la funzione.',
      ];
    },
    debugSteps: [
      'Leggi la prima riga di errore e quelle che la precedono: la causa di solito è lì.',
      "Riproduci il problema e confronta i log con un'esecuzione che funziona.",
      'Cerca il messaggio di errore esatto insieme al nome della libreria da cui proviene.',
    ],
  },
};
