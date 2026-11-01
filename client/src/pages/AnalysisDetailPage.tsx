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
      .catch((err: unknown) => {
        let message = 'Analysis not found';
        if (err instanceof Error) {
          message = err.message;
        }
        setError(message);
      });
  }, [id]);

  return (
    <div className="space-y-6 pt-6">
      <Link
        to="/history"
        className="group inline-flex items-center gap-2 text-sm text-fg-muted transition-colors hover:text-fg"
      >
        <span className="transition-transform group-hover:-translate-x-1">←</span>
        Back to history
      </Link>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-high/30 bg-high/8 px-5 py-4"
        >
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-high" />
          <p className="text-sm text-fg">{error}</p>
        </div>
      )}

      {!analysis && !error && (
        <div className="flex items-center gap-3 py-4">
          <span className="h-2 w-2 animate-pulse-dot rounded-full bg-violet" />
          <span className="text-sm text-fg-faint">Loading analysis…</span>
        </div>
      )}

      {analysis && (
        <div className="space-y-4">
          <ReportView analysis={analysis} />
          <details className="glass overflow-hidden">
            <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-4 text-sm text-fg-muted transition-colors select-none hover:text-fg">
              Original log
              <span className="font-mono text-xs text-fg-faint">
                {analysis.rawLog.split('\n').length} lines
              </span>
            </summary>
            <pre className="overflow-x-auto border-t border-line px-6 py-5 font-mono text-[13px] leading-relaxed text-fg-faint">
              {analysis.rawLog}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
