import { AnalyzeHero } from '../components/AnalyzeHero';
import { LogEditor } from '../components/LogEditor';
import { ReviewPanel } from '../components/ReviewPanel';
import { useAnalyzePage } from '../hooks/useAnalyzePage';

export function AnalyzePage() {
  const { log, analysis, canSubmit, submit, failingLines } = useAnalyzePage();

  return (
    <div>
      <AnalyzeHero />
      <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <LogEditor
          text={log.text}
          fileName={log.fileName}
          failingLines={failingLines}
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
