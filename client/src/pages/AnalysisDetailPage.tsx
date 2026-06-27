import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ReportView } from '../components/ReportView';
import { api } from '../lib/api';
import type { AnalysisRecord } from '../lib/types';

export function AnalysisDetailPage() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api
      .getAnalysis(id)
      .then(setAnalysis)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Not found'));
  }, [id]);

  return (
    <div className="space-y-5">
      <Link
        to="/history"
        className="group inline-flex items-center gap-1.5 font-head text-[9px] font-semibold tracking-[0.15em] uppercase text-fg-faint transition-colors hover:text-signal"
      >
        <span className="transition-transform group-hover:-translate-x-0.5">{'<-'}</span>
        Back to history
      </Link>

      {error && (
        <div className="flex items-start gap-2.5 rounded border border-high/20 bg-high/6 px-4 py-3">
          <span className="mt-0.5 font-mono text-[10px] text-high">!</span>
          <p className="text-xs text-high/90">{error}</p>
        </div>
      )}

      {!analysis && !error && (
        <div className="flex items-center gap-2 py-4">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-signal" />
          <span className="font-mono text-[10px] tracking-[0.1em] text-fg-faint">Loading</span>
        </div>
      )}

      {analysis && (
        <div className="space-y-3">
          <ReportView analysis={analysis} />
          <details className="overflow-hidden rounded border border-line">
            <summary className="flex cursor-pointer select-none items-center justify-between gap-4 px-5 py-3.5 font-head text-[9px] font-semibold tracking-[0.2em] uppercase text-fg-faint transition-colors hover:text-fg-muted">
              Original log
              <span className="rounded-sm border border-line bg-surface px-2 py-0.5 font-mono normal-case text-[9px] text-fg-faint">
                {analysis.rawLog.split('\n').length} lines
              </span>
            </summary>
            <pre className="overflow-x-auto border-t border-line bg-ink-deep px-5 py-4 font-mono text-[9px] leading-relaxed text-fg-faint">
              {analysis.rawLog}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
