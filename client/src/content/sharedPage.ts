import { defineText } from '../i18n/defineText';

/** Text of the public shared-report page. */
export const SHARED_PAGE_TEXT = defineText({
  en: {
    stamp: 'Read-only copy',
    sharedNote:
      'This is a shared, read-only copy of a LogLens report. The original log is not included.',
    loading: 'Loading',
    unavailableStamp: 'Not on file',
    unavailableTitle: 'This shared report is not available',
    unavailableFallback: 'The link does not exist or was revoked by its owner.',
    unavailableHint:
      'If this link used to work, its owner may have stopped sharing it. Ask them for a new one.',
    analyzeLink: 'Analyze a log of your own',
  },
  it: {
    stamp: 'Copia in sola lettura',
    sharedNote:
      'Questa è una copia condivisa di un report LogLens, in sola lettura. Il log originale non è incluso.',
    loading: 'Caricamento',
    unavailableStamp: 'Non in archivio',
    unavailableTitle: 'Questo report condiviso non è disponibile',
    unavailableFallback: 'Il link non esiste o è stato revocato dal proprietario.',
    unavailableHint:
      'Se questo link funzionava, il proprietario potrebbe aver smesso di condividerlo. Chiedigliene uno nuovo.',
    analyzeLink: 'Analizza un tuo log',
  },
});
