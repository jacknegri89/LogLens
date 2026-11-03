import { defineText } from '../i18n/defineText';
import { withCount } from '../i18n/plural';

/** Text of the single-analysis page. */
export const DETAIL_TEXT = defineText({
  en: {
    backLink: 'Back to history',
    loading: 'Opening the case file',
    originalLog: 'Original log',
    originalLogHint: 'The full printout, exactly as it was analysed',
    lineCount: (count: number) => withCount(count, ['line', 'lines']),
    loadFailed: 'Could not load this analysis',
    loadFallback: 'Analysis not found',
    offlineNotice: 'Showing the copy saved in this browser: the server cannot be reached.',
    offlineLimits: 'Sharing and feedback are unavailable until it is back.',
    logTruncated: 'The log saved in this browser is cut short.',
  },
  it: {
    backLink: 'Torna alla cronologia',
    loading: 'Apertura del fascicolo',
    originalLog: 'Log originale',
    originalLogHint: 'Il tabulato completo, esattamente come è stato analizzato',
    lineCount: (count: number) => withCount(count, ['riga', 'righe']),
    loadFailed: 'Impossibile caricare questa analisi',
    loadFallback: 'Analisi non trovata',
    offlineNotice:
      'Stai vedendo la copia salvata in questo browser: il server non è raggiungibile.',
    offlineLimits: 'Condivisione e valutazione non sono disponibili finché non torna.',
    logTruncated: 'Il log salvato in questo browser è stato troncato.',
  },
});
