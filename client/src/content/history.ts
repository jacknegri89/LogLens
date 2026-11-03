/** Text of the history page. */
export const HISTORY_TEXT = {
  eyebrow: 'Case-file drawer',
  titleStart: 'Past',
  titleMarked: 'analyses',
  intro:
    'Every log you analyzed is filed here, newest first. Open a card to read its report again.',
  savedCount: (count: number) => `${count} on file`,
  caseNumber: (number: number) => `No. ${String(number).padStart(2, '0')}`,
  openCard: 'Open file',
  emptyTitle: 'The drawer is empty',
  empty: 'No analyses yet. Run a log and it is saved here.',
  emptyCardLabel: 'Awaiting evidence',
  analyzeLink: 'Analyze your first log',
  loading: 'Opening the drawer',
  clearButton: 'Delete history',
  clearQuestion: 'Delete the history?',
  clearConfirm: 'Delete every saved analysis? This cannot be undone.',
  clearYes: 'Yes, shred everything',
  clearNo: 'Cancel',
  clearing: 'Shredding',
  clearFailed: 'Could not delete the history',
};
