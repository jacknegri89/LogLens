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
    <div className="max-w-3xl pt-4">
      <Link
        to="/history"
        className="font-bold underline decoration-2 underline-offset-4 hover:bg-marker hover:text-ink"
      >
        Back to history
      </Link>

      {error && (
        <div role="alert" className="mt-10 border-l-4 border-marker pl-4">
          <p className="text-lg font-bold">Could not load this analysis</p>
          <p className="mt-1 text-chalk">{error}</p>
        </div>
      )}

      {!analysis && !error && <p className="caret mt-10 text-lg text-chalk">Loading</p>}

      {analysis && (
        <div className="mt-10 space-y-12">
          <ReportView analysis={analysis} />
          <details>
            <summary className="flex cursor-pointer items-center justify-between gap-4 border-b-2 border-chalk-dim pb-2 text-sm font-extrabold tracking-widest uppercase select-none [font-stretch:125%] hover:text-marker">
              Original log
              <span className="font-mono text-xs font-normal tracking-normal normal-case">
                {analysis.rawLog.split('\n').length} lines
              </span>
            </summary>
            <pre className="bands mt-4 overflow-x-auto p-4 font-mono text-[13.5px] leading-[22px] text-ink">
              {analysis.rawLog}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
