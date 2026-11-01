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
    <div className="max-w-3xl">
      <Link
        to="/history"
        className="text-sm text-muted underline underline-offset-4 hover:text-ink"
      >
        Back to history
      </Link>

      {error && (
        <div role="alert" className="mt-8 border-l-2 border-high pl-4">
          <p className="text-[15px] font-medium text-high">Could not load this analysis</p>
          <p className="mt-1 text-[15px] text-muted">{error}</p>
        </div>
      )}

      {!analysis && !error && <p className="caret mt-8 text-[15px] text-muted">Loading</p>}

      {analysis && (
        <div className="mt-8 space-y-10">
          <ReportView analysis={analysis} />
          <details className="border border-rule-strong bg-panel">
            <summary className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3 text-sm font-medium select-none hover:bg-paper">
              Original log
              <span className="font-mono text-xs font-normal text-muted">
                {analysis.rawLog.split('\n').length} lines
              </span>
            </summary>
            <pre className="overflow-x-auto border-t border-rule p-4 font-mono text-[12.5px] leading-6">
              {analysis.rawLog}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
