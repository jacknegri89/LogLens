import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { ReportView } from '../components/ReportView';
import { api } from '../lib/api';
import { EXAMPLES } from '../lib/examples';
import type { AnalysisRecord } from '../lib/types';

type Status = 'idle' | 'loading' | 'error';

export function AnalyzePage() {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalysisRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = text.trim().length > 0 && status !== 'loading';

  function loadFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result ?? ''));
      setFileName(file.name);
    };
    reader.readAsText(file);
  }

  async function onAnalyze() {
    if (!canSubmit) return;
    setStatus('loading');
    setError('');
    setResult(null);
    try {
      const record = await api.createAnalysis({
        rawLog: text,
        source: fileName ? 'upload' : 'paste',
        fileName: fileName ?? undefined,
      });
      setResult(record);
      setStatus('idle');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStatus('error');
    }
  }

  return (
    <div className="space-y-10">
      <section className="pt-4 text-center">
        <p className="font-mono text-xs tracking-[0.3em] text-signal uppercase">AI log analysis</p>
        <h1 className="mx-auto mt-4 max-w-2xl text-4xl leading-tight font-bold text-balance text-fg sm:text-5xl">
          Find the real error in the noise.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-fg-muted">
          Paste a log or stack trace. LogLens pinpoints the problem, rates its severity, and writes
          a bug report you can drop straight into a GitHub issue.
        </p>
      </section>

      <section
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) loadFile(file);
        }}
        className={`overflow-hidden rounded-2xl border bg-surface/60 shadow-2xl shadow-black/40 transition-colors ${
          dragging ? 'border-signal' : 'border-line'
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <span className="font-mono text-xs tracking-wider text-fg-faint uppercase">
            {fileName ?? 'log input'}
          </span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="font-mono text-xs text-fg-muted transition-colors hover:text-signal"
          >
            upload .txt / .log
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.log,text/plain"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) loadFile(file);
            }}
          />
        </div>

        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (fileName) setFileName(null);
          }}
          placeholder={'Paste your log here, or drop a .log file...'}
          spellCheck={false}
          className="block h-72 w-full resize-y bg-transparent px-4 py-4 font-mono text-sm text-fg placeholder:text-fg-faint focus:outline-none"
        />

        <div className="flex flex-wrap items-center gap-2.5 border-t border-line px-4 py-3">
          <span className="font-mono text-xs text-fg-faint">try:</span>
          {EXAMPLES.map((example) => (
            <button
              key={example.label}
              type="button"
              onClick={() => {
                setText(example.content);
                setFileName(null);
              }}
              className="rounded-md border border-line px-2.5 py-1 font-mono text-xs text-fg-muted transition-colors hover:border-signal/50 hover:text-fg"
            >
              {example.label}
            </button>
          ))}
          <span className="ml-auto font-mono text-xs text-fg-faint">
            {text.length.toLocaleString()} chars
          </span>
          <button
            type="button"
            onClick={onAnalyze}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-lg bg-signal px-4 py-2 font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {status === 'loading' ? 'Analyzing...' : 'Analyze'}
            <span aria-hidden>{'->'}</span>
          </button>
        </div>
      </section>

      {status === 'loading' && <ScanningLoader />}

      {status === 'error' && (
        <div className="rounded-xl border border-high/40 bg-high/10 px-4 py-3 text-sm text-high">
          {error}
        </div>
      )}

      {result && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-xs tracking-wider text-fg-faint uppercase">Result</h2>
            <Link
              to={`/analyses/${result.id}`}
              className="font-mono text-xs text-fg-muted transition-colors hover:text-signal"
            >
              open full page {'->'}
            </Link>
          </div>
          <ReportView analysis={result} />
        </section>
      )}
    </div>
  );
}

function ScanningLoader() {
  return (
    <div className="rounded-xl border border-line bg-surface/60 px-5 py-6">
      <span className="font-mono text-sm text-fg-muted">Scanning the log...</span>
      <div className="relative mt-4 h-1 overflow-hidden rounded-full bg-line">
        <div className="absolute inset-y-0 w-1/3 animate-[scan_1.2s_ease-in-out_infinite] rounded-full bg-signal" />
      </div>
      <p className="mt-3 font-mono text-xs text-fg-faint">
        A local model may take a few seconds on the first run.
      </p>
    </div>
  );
}
