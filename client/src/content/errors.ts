import { defineText, type TextOf } from '../i18n/defineText';

/** Messages shown to the visitor when something goes wrong. */
export const ERROR_TEXT = defineText({
  en: {
    unknown: 'Something went wrong',
    unreachable: 'Cannot reach the analysis server. Check your connection and try again.',
    requestFailed: (status: number) => `Request failed (${status})`,
    stamp: 'Error',
  },
  it: {
    unknown: 'Qualcosa è andato storto',
    unreachable:
      'Impossibile raggiungere il server di analisi. Controlla la connessione e riprova.',
    requestFailed: (status: number) => `Richiesta non riuscita (${status})`,
    stamp: 'Errore',
  },
});

export type ErrorText = TextOf<typeof ERROR_TEXT>;

/** The page for an address that matches nothing. */
export const LOST_PAGE_TEXT = defineText({
  en: {
    code: 'Error 404',
    titleStart: 'Not in',
    titleMarked: 'the drawer',
    message:
      'This page does not exist. The address may be mistyped, or it pointed to an analysis that was deleted.',
    cardNumber: 'No. ???',
    stamp: 'Missing',
    analyzeLink: 'Analyze a log',
    historyLink: 'Open past analyses',
  },
  it: {
    code: 'Errore 404',
    titleStart: 'Non nel',
    titleMarked: 'cassetto',
    message:
      "Questa pagina non esiste. L'indirizzo potrebbe contenere un errore, oppure puntava a un'analisi che è stata eliminata.",
    cardNumber: 'N. ???',
    stamp: 'Mancante',
    analyzeLink: 'Analizza un log',
    historyLink: 'Apri le analisi passate',
  },
});
