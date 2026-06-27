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
    return 'Cannot reach analysis server. Is Ollama running at localhost:11434?';
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
    <div className="space-y-8">
      {/* Hero — 2-column asymmetric */}
      <section className="grid gap-8 pt-4 md:grid-cols-[1fr_auto]">
        <div>
          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="font-head text-[9px] font-semibold tracking-[0.28em] uppercase text-signal">
              AI log analysis
            </span>
            <div className="h-px w-6 bg-line" />
          </div>
          <h1 className="font-head text-[48px] font-extrabold uppercase leading-[0.95] tracking-[0.01em] sm:text-[60px]">
            <span className="text-fg-faint">Find the</span><br />
            <span className="text-fg">real </span><span className="text-signal">error.</span>
          </h1>
          <p className="mt-5 max-w-[36ch] text-sm leading-relaxed text-fg-faint">
            Paste a log or stack trace. LogLens pinpoints the root cause, rates severity, and writes a bug report ready for GitHub.
          </p>
        </div>
        <div className="hidden flex-col justify-center gap-0 md:flex">
          {(['Paste log', 'AI finds root cause', 'Rate severity', 'Copy issue'] as const).map((step, i) => (
            <div key={i} className="flex items-baseline gap-3 border-b border-line py-2.5 last:border-0">
              <span className="font-head text-xl font-extrabold leading-none text-signal">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="font-head text-[9px] font-semibold tracking-[0.18em] uppercase text-fg-faint">
                {step}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Terminal input */}
      <section
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) loadFile(file);
        }}
        className={`overflow-hidden rounded border transition-colors ${
          dragging ? 'border-signal' : 'border-line focus-within:border-line-strong'
        }`}
      >
        {/* Titlebar */}
        <div className="flex items-center justify-between border-b border-line bg-surface-2 px-4 py-2">
          <div className="flex items-center gap-2.5">
            <div className="flex gap-1.5">
              <span className={`h-2 w-2 rounded-full ${text ? 'bg-signal' : 'bg-line-strong'}`} />
              <span className="h-2 w-2 rounded-full bg-line-strong" />
              <span className="h-2 w-2 rounded-full bg-line-strong" />
            </div>
            <span className="font-mono text-[9px] tracking-[0.06em] text-fg-faint">
              {fileName
                ? `${fileName} · ${text.length.toLocaleString()} chars`
                : text.length > 0
                  ? `${text.length.toLocaleString()} chars`
                  : 'ready'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-sm border border-line px-2 py-0.5 font-head text-[9px] font-semibold tracking-[0.12em] uppercase text-fg-faint transition-colors hover:border-line-strong hover:text-fg-muted"
          >
            Upload file
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
          placeholder="# paste log or stack trace here"
          spellCheck={false}
          className="block h-64 w-full resize-y bg-ink-deep px-5 py-4 font-mono text-xs text-fg-muted placeholder:text-fg-faint/40 focus:outline-none"
        />

        {/* Statusbar */}
        <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2 px-4 py-2.5">
          {status === 'loading' ? (
            <div className="flex flex-1 items-center gap-2.5">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-signal" />
              <span className="font-head text-[10px] font-semibold tracking-[0.15em] uppercase text-fg-muted">
                Scanning log file
              </span>
              <button
                type="button"
                onClick={onCancel}
                className="ml-auto font-mono text-[9px] text-fg-faint transition-colors hover:text-fg-muted"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <span className="font-head text-[8px] font-semibold tracking-[0.2em] uppercase text-fg-faint">
                try:
              </span>
              {EXAMPLES.map((example) => (
                <button
                  key={example.label}
                  type="button"
                  onClick={() => { setText(example.content); setFileName(null); }}
                  className="rounded-sm border border-line px-2 py-0.5 font-head text-[9px] font-semibold tracking-[0.1em] uppercase text-fg-faint transition-colors hover:border-line-strong hover:text-fg-muted"
                >
                  {example.label}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onAnalyze}
                  disabled={!canSubmit}
                  className="rounded-sm bg-signal px-4 py-1.5 font-head text-[10px] font-extrabold tracking-[0.18em] uppercase text-ink-deep transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Analyze
                </button>
              </div>
            </>
          )}
        </div>

        {/* Scan progress bar */}
        {status === 'loading' && (
          <div className="relative h-px overflow-hidden bg-line">
            <div className="absolute inset-y-0 w-1/3 animate-scan bg-signal" />
          </div>
        )}
      </section>

      {status === 'error' && (
        <div className="flex items-start gap-2.5 rounded border border-high/20 bg-high/6 px-4 py-3">
          <span className="mt-0.5 font-mono text-[10px] text-high">!</span>
          <div>
            <p className="text-xs text-high/90">{error}</p>
            <p className="mt-1 font-mono text-[9px] text-fg-faint">
              Check that your analysis server is running.
            </p>
          </div>
        </div>
      )}

      {result && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Link
              to={`/analyses/${result.id}`}
              className="font-head text-[9px] font-semibold tracking-[0.15em] uppercase text-fg-faint transition-colors hover:text-signal"
            >
              Open full page {'->'}
            </Link>
          </div>
          <ReportView analysis={result} />
        </section>
      )}
    </div>
  );
}
