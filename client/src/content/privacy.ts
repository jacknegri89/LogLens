import { defineText } from '../i18n/defineText';

/**
 * Text of the privacy and cookie page. It describes what the public instance really does: when
 * the behaviour of the app changes (what is sent to a provider, what is stored, for how long),
 * this text and the date in `updated` change with it. The legal wording was not written by a
 * lawyer and should be reviewed by one.
 */
export const PRIVACY_TEXT = defineText({
  en: {
    footerLink: 'Privacy and cookies',
    title: 'Privacy and cookies',
    updated: 'Last updated: 9 November 2026',
    intro:
      'LogLens is a free tool to read logs. This page explains which data it handles, why, where it goes and how long it stays.',
    sections: [
      {
        heading: 'Who is responsible',
        body: [
          'The data controller is Giacomo Negri, the author of LogLens. Contact: negrigiacomo435@gmail.com.',
        ],
      },
      {
        heading: 'What we handle',
        body: [
          'Log text. When you press Analyze, the log you paste or upload is sent to the server and saved with its report, so that you can find it in your history. A log can contain personal data (names, e-mail addresses, IP addresses, tokens). Turn on Anonymize before sending to replace them in your browser first.',
          'A random visitor id. Your browser keeps a random identifier, which the server uses to show you only your own history. It is not linked to your name or to an account, because there are no accounts.',
          'Your network address, in hashed form. The server does not keep the address itself. It keeps a salted hash of it, used to count analysis attempts per visitor against the usage limits.',
          'Your feedback and share links. If you mark a report as useful or not useful, that answer is saved. If you create a share link, the report it points to is readable by anyone who has the link, until you revoke it. A shared report never includes the original log, and secrets and e-mail addresses in its text are hidden each time it is opened; the lines it quotes can still contain other personal data, such as IP addresses.',
        ],
      },
      {
        heading: 'Why we handle it, and on which basis',
        body: [
          'To run the analysis you ask for, keep your history and let you share a report: this is needed to provide the service you request (GDPR art. 6(1)(b)).',
          'To limit abuse, protect the service from overload and keep it secure, using the hashed address and the attempt counts (art. 6(1)(f), our legitimate interest).',
          'To understand, in aggregate, which pages are visited, through the analytics described below (art. 6(1)(f)). This data is not used to profile you.',
        ],
      },
      {
        heading: 'Who else receives data',
        body: [
          'Vercel, which hosts the site and runs the aggregated analytics. Vercel is based in the United States.',
          'Neon, which hosts the database where analyses and attempt counts are saved. The database is hosted by AWS in the US East 1 region (N. Virginia, United States).',
          'OpenAI, for the analysis of complex logs. LogLens first reads every log with its own rules, on its own server. When a log is complex or the rules cannot settle it, a structured summary of its events (message, level, time, service, identifiers and the key-value fields of each line) is sent to OpenAI, which is based in the United States; the raw file is not sent. Passwords, tokens, keys and similar secrets are hidden first, and session identifiers are replaced by pseudonyms. Other personal data, such as e-mail addresses or IP addresses, is not removed in this step: turn on Anonymize before sending to replace it first.',
          'No other service receives your data. The fonts and scripts of the site are served by the site itself, so opening a page does not make your browser contact any other third party.',
          'Transfers outside the European Economic Area are covered by the data processing addenda of these providers, which include the European Commission’s standard contractual clauses.',
        ],
      },
      {
        heading: 'How long we keep it',
        body: [
          'Analyses, with their logs and reports, become eligible for deletion after 90 days. Cleanup runs on the next scheduled daily job or qualifying request; a failed job can delay deletion. You can delete them earlier from your history, and revoking a share link stops it from working at once.',
          'Analysis attempts stop counting after one hour. Their hashed addresses are deleted at the next analysis attempt or by the daily cleanup job, whichever comes first.',
          'The copy of your history saved in your browser stays there until you clear it, from the history page or from the browser settings.',
        ],
      },
      {
        heading: 'Cookies and local storage',
        body: [
          'LogLens does not use cookies. It does not install tracking, advertising or third-party cookies.',
          'It uses the local storage of your browser, which is a similar place on your device, for the choices you make: your language, the Anonymize option, the high-contrast theme, your visitor id and the copy of your history. These items are needed for the features you use, and they are not sent to anyone except the server requests described above.',
          'Vercel Web Analytics does not use cookies. It records page views, the referrer, the approximate country and city, the browser and the device type. Share links are not recorded in full: the secret part of the address is removed before the page view is sent.',
          'You can clear all of this from your browser settings. Clearing the browser data also removes the local copy of your history; the analyses saved on the server stay until you delete them.',
        ],
      },
      {
        heading: 'Your rights',
        body: [
          'You can ask for access to your data, correction, deletion, restriction, portability, and you can object to processing (GDPR arts. 15 to 21). Deletion of your analyses is available in the history page.',
          'You can also lodge a complaint with the Italian data protection authority, the Garante per la protezione dei dati personali (garanteprivacy.it).',
        ],
      },
      {
        heading: 'Changes to this page',
        body: [
          'If LogLens changes the data it handles, this page is updated and the date at the top changes.',
        ],
      },
    ],
  },
  it: {
    footerLink: 'Privacy e cookie',
    title: 'Privacy e cookie',
    updated: 'Ultimo aggiornamento: 9 novembre 2026',
    intro:
      'LogLens è uno strumento gratuito per leggere i log. Questa pagina spiega quali dati tratta, perché, dove vanno e per quanto tempo restano.',
    sections: [
      {
        heading: 'Chi è responsabile',
        body: [
          'Il titolare del trattamento è Giacomo Negri, autore di LogLens. Contatto: negrigiacomo435@gmail.com.',
        ],
      },
      {
        heading: 'Quali dati trattiamo',
        body: [
          'Il testo del log. Quando premi Analizza, il log che incolli o carichi viene inviato al server e salvato insieme al suo report, così lo ritrovi nella cronologia. Un log può contenere dati personali (nomi, e-mail, indirizzi IP, token). Attiva Anonimizza prima dell’invio per sostituirli già nel tuo browser.',
          'Un identificativo casuale del visitatore. Il browser conserva un identificativo casuale, che il server usa per mostrarti solo la tua cronologia. Non è collegato a un nome né a un account, perché gli account non esistono.',
          'Il tuo indirizzo di rete, in forma di hash. Il server non conserva l’indirizzo. Conserva un hash con sale, usato per contare i tentativi di analisi di ciascun visitatore rispetto ai limiti di utilizzo.',
          'Il tuo feedback e i link di condivisione. Se segni un report come utile o non utile, la risposta viene salvata. Se crei un link di condivisione, il report è leggibile da chiunque abbia il link, finché non lo revochi. Un report condiviso non include mai il log originale, e i segreti e gli indirizzi e-mail nel suo testo vengono nascosti a ogni apertura; le righe che cita possono comunque contenere altri dati personali, come indirizzi IP.',
        ],
      },
      {
        heading: 'Perché li trattiamo e con quale base giuridica',
        body: [
          'Per eseguire l’analisi che chiedi, mantenere la tua cronologia e consentirti di condividere un report: serve a fornire il servizio che richiedi (art. 6, par. 1, lett. b, GDPR).',
          'Per limitare gli abusi, proteggere il servizio dal sovraccarico e mantenerlo sicuro, usando l’hash dell’indirizzo e il conteggio dei tentativi (art. 6, par. 1, lett. f, legittimo interesse).',
          'Per capire, in forma aggregata, quali pagine vengono visitate, tramite le statistiche descritte sotto (art. 6, par. 1, lett. f). Questi dati non servono a profilare chi naviga.',
        ],
      },
      {
        heading: 'Chi altro riceve i dati',
        body: [
          'Vercel, che ospita il sito ed effettua le statistiche aggregate. Vercel ha sede negli Stati Uniti.',
          'Neon, che ospita il database in cui vengono salvate le analisi e i conteggi dei tentativi. Il database è ospitato da AWS nella regione US East 1 (Virginia del Nord, Stati Uniti).',
          'OpenAI, per l’analisi dei log complessi. LogLens legge prima ogni log con le proprie regole, sul proprio server. Quando un log è complesso o le regole non bastano, a OpenAI, che ha sede negli Stati Uniti, viene inviato un riepilogo strutturato dei suoi eventi (messaggio, livello, orario, servizio, identificatori e i campi chiave-valore di ogni riga); il file grezzo non viene inviato. Password, token, chiavi e segreti simili vengono prima nascosti e gli identificatori di sessione sono sostituiti da pseudonimi. Gli altri dati personali, come indirizzi e-mail o IP, non vengono rimossi in questo passaggio: attiva Anonimizza prima dell’invio per sostituirli già prima.',
          'Nessun altro servizio riceve i tuoi dati. I font e gli script del sito sono serviti dal sito stesso, quindi aprire una pagina non fa contattare al tuo browser altri soggetti terzi.',
          'I trasferimenti fuori dallo Spazio economico europeo sono coperti dagli addendum sul trattamento dei dati di questi fornitori, che includono le clausole contrattuali tipo della Commissione europea.',
        ],
      },
      {
        heading: 'Per quanto tempo li conserviamo',
        body: [
          'Le analisi, con log e report, diventano eliminabili dopo 90 giorni. La pulizia avviene alla successiva esecuzione giornaliera o richiesta che la attiva; un errore può ritardarla. Puoi cancellarle prima dalla cronologia, e revocare un link di condivisione lo rende subito inaccessibile.',
          'I tentativi di analisi non contano più dopo un’ora. Gli hash degli indirizzi vengono cancellati al successivo tentativo di analisi o dalla pulizia giornaliera, a seconda di quale arriva prima.',
          'La copia della cronologia salvata nel browser resta lì finché non la cancelli dalla pagina della cronologia o dalle impostazioni del browser.',
        ],
      },
      {
        heading: 'Cookie e archiviazione locale',
        body: [
          'LogLens non usa cookie. Non installa cookie di tracciamento, pubblicitari o di terze parti.',
          'Usa l’archiviazione locale del browser, un luogo simile sul tuo dispositivo, per le scelte che fai: lingua, opzione Anonimizza, tema ad alto contrasto, identificativo del visitatore e copia della cronologia. Questi dati servono alle funzioni che usi e non vengono inviati a nessuno, oltre alle richieste al server descritte sopra.',
          'Vercel Web Analytics non usa cookie. Registra le visualizzazioni di pagina, il riferimento di provenienza, il paese e la città approssimativi, il browser e il tipo di dispositivo. I link di condivisione non vengono registrati per intero: la parte segreta dell’indirizzo viene rimossa prima dell’invio.',
          'Puoi cancellare tutto questo dalle impostazioni del browser. Cancellare i dati del browser rimuove anche la copia locale della cronologia; le analisi salvate sul server restano finché non le cancelli.',
        ],
      },
      {
        heading: 'I tuoi diritti',
        body: [
          'Puoi chiedere l’accesso ai tuoi dati, la rettifica, la cancellazione, la limitazione, la portabilità e puoi opporti al trattamento (artt. da 15 a 21 GDPR). La cancellazione delle tue analisi è disponibile nella pagina della cronologia.',
          'Puoi inoltre proporre reclamo al Garante per la protezione dei dati personali (garanteprivacy.it).',
        ],
      },
      {
        heading: 'Modifiche a questa pagina',
        body: [
          'Se LogLens cambia i dati che tratta, questa pagina viene aggiornata e cambia la data in alto.',
        ],
      },
    ],
  },
});
