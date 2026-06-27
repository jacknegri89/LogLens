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
      {/* Hero */}
      <section className="pb-2 pt-6 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-signal/20 bg-signal/5 px-4 py-1.5">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-signal" />
          <span className="font-mono text-xs tracking-[0.2em] text-signal uppercase">
            AI log analysis
          </span>
        </div>
        <h1 className="mx-auto max-w-3xl text-5xl leading-[1.1] font-bold text-balance text-fg sm:text-6xl">
          Find the real error{' '}
          <span className="text-fg-muted">in the noise.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-fg-muted">
          Paste a log or stack trace. LogLens pinpoints the problem, rates its severity, and writes
          a bug report you can drop straight into a GitHub issue.
        </p>
      </section>

      {/* Log input card */}
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
        className={`overflow-hidden rounded-2xl border bg-surface/60 shadow-2xl shadow-black/50 transition-all ${
          dragging
            ? 'border-signal shadow-[0_0_40px_rgba(196,241,53,0.12)]'
            : 'border-line focus-within:border-signal/40'
        }`}
      >
        {/* Chrome bar */}
        <div className="flex items-center justify-between border-b border-line bg-surface-2/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-line" />
            <span className="h-2 w-2 rounded-full bg-line" />
            <span className="h-2 w-2 rounded-full bg-line" />
            <span className="ml-3 font-mono text-xs text-fg-faint">
              {fileName ?? 'stdin'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded border border-transparent px-2 py-0.5 font-mono text-xs text-fg-faint transition-all hover:border-line hover:text-fg-muted"
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
          placeholder="Paste your log here, or drop a .log file..."
          spellCheck={false}
          className="block h-72 w-full resize-y bg-transparent px-5 py-4 font-mono text-sm text-fg placeholder:text-fg-faint/50 focus:outline-none"
        />

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2/50 px-4 py-3">
          <span className="font-mono text-xs text-fg-faint">try:</span>
          {EXAMPLES.map((example) => (
            <button
              key={example.label}
              type="button"
              onClick={() => {
                setText(example.content);
                setFileName(null);
              }}
              className="rounded-md border border-line/80 bg-surface/40 px-3 py-1 font-mono text-xs text-fg-faint transition-all hover:border-signal/30 hover:bg-signal/5 hover:text-fg"
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
            className="inline-flex items-center gap-2 rounded-lg bg-signal px-5 py-2 font-semibold text-ink shadow-[0_0_20px_rgba(196,241,53,0.2)] transition-all hover:brightness-110 hover:shadow-[0_0_28px_rgba(196,241,53,0.4)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {status === 'loading' ? 'Analyzing...' : 'Analyze'}
            <span aria-hidden>{'->'}</span>
          </button>
        </div>
      </section>

      {status === 'loading' && <ScanningLoader />}

      {status === 'error' && (
        <div className="rounded-xl border border-high/30 bg-high/10 px-4 py-3 text-sm text-high">
          {error}
        </div>
      )}

      {result && (
        <section className="animate-fade-up space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-xs tracking-[0.15em] text-fg-faint uppercase">Result</h2>
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
    <div className="animate-fade-up rounded-2xl border border-line/70 bg-surface/50 px-6 py-7 shadow-xl shadow-black/30">
      <div className="mb-5 flex items-center gap-3">
        <span className="h-2 w-2 animate-pulse-dot rounded-full bg-signal shadow-[0_0_6px_rgba(196,241,53,0.6)]" />
        <span className="font-mono text-sm text-fg-muted">Scanning log file...</span>
      </div>
      <div className="relative h-0.5 overflow-hidden rounded-full bg-line">
        <div className="absolute inset-y-0 w-1/3 animate-scan rounded-full bg-signal shadow-[0_0_8px_rgba(196,241,53,0.8)]" />
      </div>
      <p className="mt-5 font-mono text-xs text-fg-faint">
        Local models may take a few seconds on the first run.
      </p>
    </div>
  );
}
