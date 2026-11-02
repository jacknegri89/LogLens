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
  cancelButton: 'Cancel',
  shortcutHint: 'Ctrl + Enter to analyze',
  readingLog: 'Reading the log',
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
