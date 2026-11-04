import { defineText } from '../i18n/defineText';

/**
 * Text of the privacy and cookie page. Items in square brackets are placeholders the owner
 * must fill in before publishing (contact details, hosting region).
 */
export const PRIVACY_TEXT = defineText({
  en: {
    footerLink: 'Privacy and cookies',
    title: 'Privacy and cookies',
    updated: 'Last updated: 4 November 2026',
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
          'Your feedback and share links. If you mark a report as useful or not useful, that answer is saved. If you create a share link, the report it points to is readable by anyone who has the link, until you revoke it.',
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
          'Neon, which hosts the database where analyses and attempt counts are saved. Region: [TODO: region of the database].',
          'OpenAI, only when the operator enables an OpenAI-based AI provider. In that case, an excerpt of the log, made of the lines selected for the analysis, is sent to OpenAI, which is based in the United States.',
          'Transfers outside the European Economic Area rely on the safeguards offered by these providers. [TODO: confirm the safeguards with the providers before publishing].',
        ],
      },
      {
        heading: 'How long we keep it',
        body: [
          'Analyses, with their logs and reports, stay in the database until you delete them from your history or revoke their share link. [TODO: decide whether to add an automatic deletion period].',
          'Analysis attempts, with the hashed address, are deleted after one hour, when they no longer count towards the limits.',
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
    updated: 'Ultimo aggiornamento: 4 novembre 2026',
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
          'Il tuo feedback e i link di condivisione. Se segni un report come utile o non utile, la risposta viene salvata. Se crei un link di condivisione, il report è leggibile da chiunque abbia il link, finché non lo revochi.',
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
          'Neon, che ospita il database in cui vengono salvate le analisi e i conteggi dei tentativi. Regione: [TODO: regione del database].',
          'OpenAI, solo quando il gestore del sito attiva un fornitore di AI basato su OpenAI. In quel caso viene inviato a OpenAI, che ha sede negli Stati Uniti, un estratto del log composto dalle righe selezionate per l’analisi.',
          'I trasferimenti fuori dallo Spazio economico europeo si basano sulle garanzie offerte da questi fornitori. [TODO: verificare le garanzie con i fornitori prima della pubblicazione].',
        ],
      },
      {
        heading: 'Per quanto tempo li conserviamo',
        body: [
          'Le analisi, con log e report, restano nel database finché non le cancelli dalla cronologia o non revochi il loro link di condivisione. [TODO: decidere se aggiungere una cancellazione automatica dopo un periodo].',
          'I tentativi di analisi, con l’hash dell’indirizzo, vengono cancellati dopo un’ora, quando non contano più ai fini dei limiti.',
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
