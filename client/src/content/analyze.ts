/** Text of the Analyze page: the hero, the log editor and the review panel. */
export const ANALYZE_TEXT = {
  heroLines: ['Find', 'the line', 'that'],
  heroMarked: 'broke.',
  heroIntro:
    'Paste a log or a stack trace. LogLens marks the failing lines, rates how serious it is and drafts the GitHub issue.',
  untitledLog: 'Log',
  lineCountSuffix: (count: number) => ` · ${count} lines`,
  examplesLabel: 'Examples:',
  editorLabel: 'Log or stack trace',
  editorPlaceholder: 'Paste a log or stack trace here, or drop a .log file.',
  analyzeButton: 'Analyze log',
  openFileButton: 'Open file',
  clearButton: 'Clear',
  cancelButton: 'Cancel',
  shortcutHint: 'Ctrl + Enter to analyze',
  anonymizeLabel: 'Anonymize before sending',
  anonymizeHint: 'IPs, e-mails, secrets and user names are replaced in your browser first.',
  anonymizedNothing: 'Anonymize was on: nothing sensitive found.',
  anonymizedNotice: (replaced: Record<string, number>) => anonymizedNotice(replaced),
  readingLog: 'Reading the log',
  analysisStages: ['Reading', 'Matching rules', 'Writing the report'],
  dropTitle: 'Drop the log to read it',
  dropHint: 'A .log or .txt file, plain text',
  fileChipLines: (count: number) => `${count} lines`,
  failedTitle: 'Analysis failed',
  openFullPage: 'Open full page',
  reviewTitle: 'Review',
  reviewEmpty: 'Nothing analysed yet. Run a log and the review appears here:',
  reviewItems: {
    failingLines: 'Failing lines',
    failingLinesRest: 'with their line numbers',
    severity: 'Severity and category',
    causes: 'Probable causes and debug steps',
    issue: 'A GitHub issue ready to copy',
  },
};

const REPLACED_LABELS: Record<string, [singular: string, plural: string]> = {
  IP: ['IP', 'IPs'],
  EMAIL: ['e-mail', 'e-mails'],
  SECRET: ['secret', 'secrets'],
  USER: ['user name', 'user names'],
};

/** "Anonymized: 3 IPs, 1 e-mail, 2 secrets replaced" */
function anonymizedNotice(replaced: Record<string, number>): string {
  const parts = Object.entries(REPLACED_LABELS)
    .filter(([kind]) => replaced[kind] > 0)
    .map(
      ([kind, [singular, plural]]) =>
        `${replaced[kind]} ${replaced[kind] === 1 ? singular : plural}`,
    );
  return parts.length ? `Anonymized: ${parts.join(', ')} replaced` : ANALYZE_TEXT.anonymizedNothing;
}
