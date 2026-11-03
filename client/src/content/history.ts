import { defineText } from '../i18n/defineText';

function paddedNumber(number: number): string {
  return String(number).padStart(2, '0');
}

/** Text of the history page. */
export const HISTORY_TEXT = defineText({
  en: {
    titleStart: 'Past',
    titleMarked: 'analyses',
    intro:
      'Every log you analyzed is filed here, newest first. Open a card to read its report again.',
    savedCount: (count: number) => `${count} on file`,
    caseNumber: (number: number) => `No. ${paddedNumber(number)}`,
    openCard: 'Open file',
    emptyTitle: 'The drawer is empty',
    empty: 'No analyses yet. Run a log and it is saved here.',
    emptyCardLabel: 'Awaiting evidence',
    analyzeLink: 'Analyze your first log',
    loading: 'Opening the drawer',
    loadFailed: 'Could not load the history',
    loadFallback: 'Failed to load',
    clearButton: 'Delete history',
    clearQuestion: 'Delete the history?',
    clearConfirm: 'Delete every saved analysis? This cannot be undone.',
    clearYes: 'Yes, shred everything',
    clearNo: 'Cancel',
    clearing: 'Shredding',
    clearFailed: 'Could not delete the history',
  },
  it: {
    titleStart: 'Analisi',
    titleMarked: 'passate',
    intro:
      'Ogni log che hai analizzato è archiviato qui, dal più recente. Apri una scheda per rileggere il report.',
    savedCount: (count: number) => `${count} in archivio`,
    caseNumber: (number: number) => `N. ${paddedNumber(number)}`,
    openCard: 'Apri fascicolo',
    emptyTitle: 'Il cassetto è vuoto',
    empty: 'Ancora nessuna analisi. Analizza un log e verrà salvato qui.',
    emptyCardLabel: 'In attesa di reperti',
    analyzeLink: 'Analizza il tuo primo log',
    loading: 'Apertura del cassetto',
    loadFailed: 'Impossibile caricare la cronologia',
    loadFallback: 'Caricamento non riuscito',
    clearButton: 'Elimina cronologia',
    clearQuestion: 'Eliminare la cronologia?',
    clearConfirm: "Eliminare tutte le analisi salvate? L'operazione non si può annullare.",
    clearYes: 'Sì, distruggi tutto',
    clearNo: 'Annulla',
    clearing: 'Distruzione in corso',
    clearFailed: 'Impossibile eliminare la cronologia',
  },
});
