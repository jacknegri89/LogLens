import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { ReportView } from '../components/ReportView';
import { api } from '../lib/api';
import { EXAMPLES } from '../lib/examples';
import type { AnalysisRecord } from '../lib/types';

type Status = 'idle' | 'loading' | 'error';

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : 'Something went wrong';
  if (/ECONNREFUSED|Failed to fetch|fetch failed|net::ERR_CONNECTION/i.test(msg)) {
    return 'Cannot reach analysis server — is Ollama running at localhost:11434?';
  }
  return msg;
}

export function AnalyzePage() {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalysisRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const canSubmit = text.trim().length > 0 && status !== 'loading';

  function loadFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result ?? ''));
      setFileName(file.name);
    };
    reader.readAsText(file);
  }

  function onCancel() {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus('idle');
  }

  async function onAnalyze() {
    if (!canSubmit) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('loading');
    setError('');
    setResult(null);
    try {
      const record = await api.createAnalysis(
        {
          rawLog: text,
          source: fileName ? 'upload' : 'paste',
          fileName: fileName ?? undefined,
        },
        controller.signal,
      );
      abortRef.current = null;
      setResult(record);
      setStatus('idle');
    } catch (err) {
      abortRef.current = null;
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(friendlyError(err));
      setStatus('error');
    }
  }

  return (
    <div className="space-y-10">
      {/* Hero — left-aligned, editorial rule kicker */}
      <section className="pb-2 pt-6">
        <div className="mb-7 flex items-center gap-4">
          <div className="h-px flex-1 bg-line" />
          <span className="font-mono text-xs tracking-[0.25em] text-fg-faint uppercase">
            AI log analysis
          </span>
          <div className="h-px w-8 bg-line" />
        </div>
        <h1 className="max-w-2xl text-5xl leading-[1.08] font-bold text-fg sm:text-[4rem]">
          Find the real error
          <br />
          <span className="text-fg-muted">in the noise.</span>
        </h1>
        <p className="mt-6 max-w-lg text-base leading-relaxed text-fg-muted">
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
            ? 'border-signal'
            : 'border-line focus-within:border-signal/40'
        }`}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-line bg-surface-2/50 px-4 py-2.5">
          <span className="font-mono text-xs text-fg-faint">
            {fileName ?? 'stdin'}
          </span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="font-mono text-xs text-fg-faint transition-colors hover:text-fg-muted"
          >
            upload file
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
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              onAnalyze();
            }
          }}
          placeholder="Paste your log here, or drop a .log file..."
          spellCheck={false}
          className="block h-72 w-full resize-y bg-transparent px-5 py-4 font-mono text-sm text-fg placeholder:text-fg-faint/50 focus:outline-none"
        />

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2/40 px-4 py-3">
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
            title="Analyze (Ctrl+Enter)"
            className="inline-flex items-center gap-2 rounded-lg bg-signal px-5 py-2 font-semibold text-ink transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {status === 'loading' ? 'Analyzing...' : 'Analyze'}
            <span aria-hidden>{'->'}</span>
          </button>
        </div>
      </section>

      {status === 'loading' && <ScanningLoader onCancel={onCancel} />}

      {status === 'error' && (
        <div className="rounded-xl border border-high/30 bg-high/10 px-4 py-3 text-sm text-high">
          {error}
        </div>
      )}

      {result && (
        <section className="animate-fade-up space-y-4">
          <div className="flex items-center justify-between">
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

function ScanningLoader({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="animate-fade-up rounded-2xl border border-line/70 bg-surface/50 px-6 py-7">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 animate-pulse-dot rounded-full bg-signal" />
          <span className="font-mono text-sm text-fg-muted">Scanning log file...</span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="font-mono text-xs text-fg-faint transition-colors hover:text-fg"
        >
          Cancel
        </button>
      </div>
      <div className="relative h-0.5 overflow-hidden rounded-full bg-line">
        <div className="absolute inset-y-0 w-1/3 animate-scan rounded-full bg-signal" />
      </div>
      <p className="mt-5 font-mono text-xs text-fg-faint">
        Local models may take a few seconds on the first run.
      </p>
    </div>
  );
}
