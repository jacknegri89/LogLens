import { defineText } from '../i18n/defineText';
import { withCount, type UnitForms } from '../i18n/plural';

/** One kind of sensitive value that anonymizing replaces, with its name for one and for many. */
type ReplacedLabels = Record<string, UnitForms>;

const REPLACED_LABELS_EN: ReplacedLabels = {
  IP: ['IP', 'IPs'],
  EMAIL: ['e-mail', 'e-mails'],
  SECRET: ['secret', 'secrets'],
  USER: ['user name', 'user names'],
};

// Italian keeps IP and e-mail unchanged in the plural.
const REPLACED_LABELS_IT: ReplacedLabels = {
  IP: ['IP', 'IP'],
  EMAIL: ['e-mail', 'e-mail'],
  SECRET: ['segreto', 'segreti'],
  USER: ['nome utente', 'nomi utente'],
};

/** "3 IPs, 1 e-mail, 2 secrets": the kinds that were replaced, or an empty list. */
function replacedParts(replaced: Record<string, number>, labels: ReplacedLabels): string[] {
  return Object.entries(labels)
    .filter(([kind]) => replaced[kind] > 0)
    .map(([kind, forms]) => withCount(replaced[kind], forms));
}

/** Text of the Analyze page: the hero, the log editor and the review panel. */
export const ANALYZE_TEXT = defineText({
  en: {
    heroLines: ['Find', 'the line', 'that'],
    heroMarked: 'broke.',
    heroIntro:
      'Paste a log or a stack trace. LogLens marks the failing lines, rates how serious it is and drafts the GitHub issue.',
    heroCta: 'Open the case file',
    heroCtaHint: 'or drop a .log file on the sheet',
    exhibitLog: 'Exhibit A · the raw log',
    exhibitReview: 'Exhibit B · the review',
    evidenceTag: (number: number) => `E${number}`,
    untitledLog: 'Log',
    lineCountSuffix: (count: number) => ` · ${withCount(count, ['line', 'lines'])}`,
    editorLabel: 'Log or stack trace',
    editorPlaceholder: 'Paste a log or stack trace here, or drop a .log file.',
    analyzeButton: 'Analyze log',
    openFileButton: 'Open file',
    fileErrors: {
      tooLarge: 'This file exceeds the 600 KB limit.',
      tooLong: 'This file exceeds the 200,000-character analysis limit.',
      readFailed: 'Could not read this file.',
    },
    clearButton: 'Clear',
    cancelButton: 'Cancel',
    shortcutHint: 'Ctrl + Enter to analyze',
    anonymizeLabel: 'Anonymize before sending',
    anonymizeHint: 'IPs, e-mails, secrets and user names are replaced in your browser first.',
    anonymizedNotice: (replaced: Record<string, number>) => {
      const parts = replacedParts(replaced, REPLACED_LABELS_EN);
      if (parts.length) {
        return `Anonymized: ${parts.join(', ')} replaced`;
      }
      return 'Anonymize was on: nothing sensitive found.';
    },
    readingLog: 'Examining the evidence',
    readingHint: 'Suspicious lines get a tag on the sheet while the report is written.',
    analysisStages: ['Reading', 'Matching rules', 'Writing the report'],
    dropTitle: 'Drop it on the desk',
    dropHint: 'A .log or .txt file, plain text. It is read here, in your browser.',
    fileChipLines: (count: number) => withCount(count, ['line', 'lines']),
    failedTitle: 'Analysis failed',
    openFullPage: 'Open full page',
    reviewTitle: 'No evidence yet',
    reviewEmpty: 'Run a log through the lens and this card fills in with:',
    reviewItems: {
      failingLines: 'Failing lines',
      failingLinesRest: 'with their line numbers',
      severity: 'Severity and category',
      causes: 'Probable causes and debug steps',
      issue: 'A GitHub issue ready to copy',
    },
  },
  it: {
    heroLines: ['Trova', 'la riga', 'che ha'],
    heroMarked: 'ceduto.',
    heroIntro:
      'Incolla un log o uno stack trace. LogLens segna le righe che falliscono, valuta la gravità e prepara la issue GitHub.',
    heroCta: 'Apri il fascicolo',
    heroCtaHint: 'o trascina un file .log sul foglio',
    exhibitLog: 'Reperto A · il log grezzo',
    exhibitReview: 'Reperto B · il referto',
    evidenceTag: (number: number) => `R${number}`,
    untitledLog: 'Log',
    lineCountSuffix: (count: number) => ` · ${withCount(count, ['riga', 'righe'])}`,
    editorLabel: 'Log o stack trace',
    editorPlaceholder: 'Incolla qui un log o uno stack trace, oppure trascina un file .log.',
    analyzeButton: 'Analizza log',
    openFileButton: 'Apri file',
    fileErrors: {
      tooLarge: 'Il file supera il limite di 600 KB.',
      tooLong: 'Il file supera il limite di analisi di 200.000 caratteri.',
      readFailed: 'Impossibile leggere il file.',
    },
    clearButton: 'Svuota',
    cancelButton: 'Annulla',
    shortcutHint: 'Ctrl + Invio per analizzare',
    anonymizeLabel: "Anonimizza prima dell'invio",
    anonymizeHint: 'IP, e-mail, segreti e nomi utente vengono sostituiti prima, nel tuo browser.',
    anonymizedNotice: (replaced: Record<string, number>) => {
      const parts = replacedParts(replaced, REPLACED_LABELS_IT);
      if (parts.length) {
        return `Dati sostituiti: ${parts.join(', ')}`;
      }
      return 'Anonimizzazione attiva: nessun dato sensibile trovato.';
    },
    readingLog: 'Esame dei reperti',
    readingHint:
      "Le righe sospette ricevono un'etichetta sul foglio mentre il report viene scritto.",
    analysisStages: ['Lettura', 'Confronto con le regole', 'Scrittura del report'],
    dropTitle: 'Lascialo sulla scrivania',
    dropHint: 'Un file .log o .txt, testo semplice. Viene letto qui, nel tuo browser.',
    fileChipLines: (count: number) => withCount(count, ['riga', 'righe']),
    failedTitle: 'Analisi non riuscita',
    openFullPage: 'Apri la pagina completa',
    reviewTitle: 'Ancora nessun reperto',
    reviewEmpty: 'Passa un log sotto la lente e questa scheda si riempie con:',
    reviewItems: {
      failingLines: 'Righe che falliscono',
      failingLinesRest: 'con il loro numero di riga',
      severity: 'Gravità e categoria',
      causes: 'Cause probabili e passi di debug',
      issue: 'Una issue GitHub pronta da copiare',
    },
  },
});
