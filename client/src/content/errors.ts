/** Messages shown to the visitor when something goes wrong. */
export const ERROR_TEXT = {
  unknown: 'Something went wrong',
  unreachable: 'Cannot reach the analysis server. Check your connection and try again.',
  historyFailed: 'Could not load the history',
  loadHistoryFallback: 'Failed to load',
  analysisFailed: 'Could not load this analysis',
  analysisFallback: 'Analysis not found',
  stamp: 'Error',
};

/** The page for an address that matches nothing. */
export const LOST_PAGE_TEXT = {
  code: 'Error 404',
  titleStart: 'Not in',
  titleMarked: 'the drawer',
  message:
    'This page does not exist. The address may be mistyped, or it pointed to an analysis that was deleted.',
  cardNumber: 'No. ???',
  stamp: 'Missing',
  analyzeLink: 'Analyze a log',
  historyLink: 'Open past analyses',
};
