import { defineText } from '../i18n/defineText';

/** Text of the "was this useful" block under a report. */
export const FEEDBACK_TEXT = defineText({
  en: {
    title: 'Was this analysis useful?',
    hint: 'Press the same answer again to take it back.',
    useful: 'Useful',
    notUseful: 'Not useful',
    saveFailed: 'Could not save your answer',
  },
  it: {
    title: 'Questa analisi ti è stata utile?',
    hint: 'Premi di nuovo la stessa risposta per annullarla.',
    useful: 'Utile',
    notUseful: 'Non utile',
    saveFailed: 'Impossibile salvare la tua risposta',
  },
});
