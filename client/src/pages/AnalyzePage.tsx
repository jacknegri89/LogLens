import { AnalyzeHero } from '../components/AnalyzeHero';
import { LogEditor } from '../components/LogEditor';
import { ReviewPanel } from '../components/ReviewPanel';
import { useAnalysis } from '../hooks/useAnalysis';
import { useLogInput } from '../hooks/useLogInput';
import { findLineNumbers } from '../lib/format';
import type { AnalysisRecord } from '../lib/types';

/** Line numbers of the failing lines, but only for the analysis of this exact text. */
function failingLinesFor(result: AnalysisRecord | null, text: string): Set<number> {
  if (!result || result.rawLog !== text) return new Set();
  return new Set(findLineNumbers(result.rawLog, result.report.keyLines).values());
}

export function AnalyzePage() {
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

  return (
    <div>
      <AnalyzeHero />
      <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <LogEditor
          text={log.text}
          fileName={log.fileName}
          failingLines={failingLinesFor(analysis.result, log.text)}
          canSubmit={canSubmit}
          loading={analysis.status === 'loading'}
          onTextChange={log.changeText}
          onPickExample={log.pickExample}
          onFileLoad={log.loadFile}
          onSubmit={submit}
          onCancel={analysis.cancel}
        />
        <ReviewPanel status={analysis.status} error={analysis.error} result={analysis.result} />
      </div>
    </div>
  );
}
