import { AnalyzeHero } from '../components/AnalyzeHero';
import { LogEditor } from '../components/LogEditor';
import { ReviewPanel } from '../components/ReviewPanel';
import { useAnalyzePage } from '../hooks/useAnalyzePage';

export function AnalyzePage() {
  const { log, analysis, canSubmit, submit, clear, failingLines, anonymize, anonymizedCounts } =
    useAnalyzePage();

  return (
    <div>
      <AnalyzeHero />
      <div className="grid gap-12 pt-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-8">
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
          onClear={clear}
          anonymize={anonymize.enabled}
          onAnonymizeChange={anonymize.change}
          anonymizedCounts={anonymizedCounts}
        />
        <ReviewPanel status={analysis.status} error={analysis.error} result={analysis.result} />
      </div>
    </div>
  );
}
