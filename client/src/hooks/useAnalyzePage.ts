import { useAnalysis } from './useAnalysis';
import { useLogInput } from './useLogInput';
import { findLineNumbers } from '../lib/format';
import type { AnalysisRecord } from '../lib/types';

/** Line numbers of the failing lines, but only for the analysis of this exact text. */
function failingLinesFor(result: AnalysisRecord | null, text: string): Set<number> {
  if (!result || result.rawLog !== text) return new Set();
  return new Set(findLineNumbers(result.rawLog, result.report.keyLines).values());
}

/** Everything the Analyze page needs: the log in the editor, the request and the marks. */
export function useAnalyzePage() {
  const log = useLogInput();
  const analysis = useAnalysis();
  const canSubmit = log.text.trim().length > 0 && analysis.status !== 'loading';

  function submit() {
    if (!canSubmit) return;
    analysis.run({
      rawLog: log.text,
      source: log.fileName ? 'upload' : 'paste',
      fileName: log.fileName ?? undefined,
    });
  }

  return {
    log,
    analysis,
    canSubmit,
    submit,
    failingLines: failingLinesFor(analysis.result, log.text),
  };
}
