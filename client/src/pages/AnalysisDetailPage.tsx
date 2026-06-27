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
    <div className="space-y-6">
      <Link
        to="/history"
        className="group inline-flex items-center gap-1.5 font-mono text-xs text-fg-faint transition-colors hover:text-signal"
      >
        <span className="transition-transform group-hover:-translate-x-0.5">{'<-'}</span>
        back to history
      </Link>

      {error && (
        <div className="animate-fade-up rounded-xl border border-high/30 bg-high/10 px-4 py-3 text-sm text-high">
          {error}
        </div>
      )}

      {!analysis && !error && (
        <div className="flex items-center gap-2.5 py-4">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-signal" />
          <span className="font-mono text-sm text-fg-faint">Loading...</span>
        </div>
      )}

      {analysis && (
        <div className="animate-fade-up space-y-4">
          <ReportView analysis={analysis} />
          <details className="overflow-hidden rounded-2xl border border-line bg-surface/30">
            <summary className="flex cursor-pointer select-none items-center justify-between gap-4 px-5 py-4 font-mono text-xs tracking-wider text-fg-faint uppercase transition-colors hover:text-fg-muted">
              Original log
              <span className="rounded border border-line bg-surface px-2 py-0.5 normal-case text-fg-faint">
                {analysis.rawLog.split('\n').length} lines
              </span>
            </summary>
            <pre className="overflow-x-auto border-t border-line px-5 py-5 font-mono text-xs leading-relaxed text-fg-faint">
              {analysis.rawLog}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
