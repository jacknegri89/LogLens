import '../../styles/workbench-fix.css';
import { useWorkbench } from '../core/useWorkbench';

export interface AnalyzeFirstText {
  title: string;
  body: string;
  action: string;
  running: string;
  noLog: string;
}

/** Shown instead of a view that needs the server analysis: one button runs it. */
export function AnalyzeFirstCard({ text }: { text: AnalyzeFirstText }) {
  const { rawLog, analysis, analyze } = useWorkbench();
  const hasLog = rawLog.trim() !== '';
  const loading = analysis.status === 'loading';
  let buttonText = text.action;
  if (loading) {
    buttonText = text.running;
  }

  return (
    <section className="fix-gate" aria-labelledby="fix-gate-title">
      <h2 id="fix-gate-title" className="fix-gate-title">
        {text.title}
      </h2>
      <p className="fix-gate-body">{text.body}</p>
      {!hasLog && <p className="fix-hint">{text.noLog}</p>}
      <button
        type="button"
        onClick={analyze}
        disabled={!hasLog || loading}
        className="btn-ink px-6 py-2.5 text-sm font-bold tracking-wide uppercase disabled:cursor-not-allowed disabled:opacity-40"
      >
        {buttonText}
      </button>
    </section>
  );
}
