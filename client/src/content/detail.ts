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
  },
  it: {
    backLink: 'Torna alla cronologia',
    loading: 'Apertura del fascicolo',
    originalLog: 'Log originale',
    originalLogHint: 'Il tabulato completo, esattamente come è stato analizzato',
    lineCount: (count: number) => withCount(count, ['riga', 'righe']),
    loadFailed: 'Impossibile caricare questa analisi',
    loadFallback: 'Analisi non trovata',
  },
});
