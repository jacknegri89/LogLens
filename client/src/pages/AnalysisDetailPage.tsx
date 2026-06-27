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
        className="font-mono text-xs text-fg-muted transition-colors hover:text-signal"
      >
        {'<-'} back to history
      </Link>

      {error && (
        <div className="rounded-xl border border-high/40 bg-high/10 px-4 py-3 text-sm text-high">
          {error}
        </div>
      )}

      {!analysis && !error && <p className="font-mono text-sm text-fg-faint">Loading...</p>}

      {analysis && (
        <>
          <ReportView analysis={analysis} />
          <details className="rounded-2xl border border-line bg-surface/40">
            <summary className="cursor-pointer px-5 py-3 font-mono text-xs tracking-wider text-fg-muted uppercase">
              Original log ({analysis.rawLog.split('\n').length} lines)
            </summary>
            <pre className="overflow-x-auto border-t border-line px-5 py-4 font-mono text-xs text-fg-faint">
              {analysis.rawLog}
            </pre>
          </details>
        </>
      )}
    </div>
  );
}
