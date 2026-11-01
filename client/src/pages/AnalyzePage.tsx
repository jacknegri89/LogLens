import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { Prism } from '../components/Prism';
import { ReportView } from '../components/ReportView';
import { api } from '../lib/api';
import { EXAMPLES } from '../lib/examples';
import type { AnalysisRecord } from '../lib/types';

type Status = 'idle' | 'loading' | 'error';

function friendlyError(err: unknown): string {
  let msg = 'Something went wrong';
  if (err instanceof Error) {
    msg = err.message;
  }
  if (/ECONNREFUSED|Failed to fetch|fetch failed|net::ERR_CONNECTION/i.test(msg)) {
    return 'Cannot reach the analysis server. Make sure it is running on localhost:3001.';
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
      let source: 'upload' | 'paste' = 'paste';
      if (fileName) {
        source = 'upload';
      }

      const record = await api.createAnalysis(
        {
          rawLog: text,
          source,
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

  let consoleState = 'idle';
  if (status === 'loading') {
    consoleState = 'active';
  } else if (dragging) {
    consoleState = 'dragging';
  }

  let statusText = 'Waiting for a log';
  if (fileName) {
    statusText = `${fileName} · ${text.split('\n').length} lines`;
  } else if (text.length > 0) {
    statusText = `${text.split('\n').length} lines · ${text.length.toLocaleString()} characters`;
  }

  return (
    <div>
      {/* Hero: headline on the left, the prism on the right */}
      <section className="grid items-center gap-8 pt-6 pb-12 lg:grid-cols-[1.05fr_1fr] lg:pt-12 lg:pb-16">
        <div className="animate-rise">
          <h1 className="font-display text-[clamp(2.4rem,6vw,4.6rem)] leading-[1.02] font-light tracking-tight">
            Find the
            <br />
            line that{' '}
            <span
              className="bg-clip-text font-medium text-transparent"
              style={{
                backgroundImage: 'linear-gradient(100deg, #8f6bff, #4fd6ff 45%, #ff4f8b)',
              }}
            >
              broke.
            </span>
          </h1>
          <p className="mt-7 max-w-[44ch] text-lg leading-relaxed text-fg-muted">
            Paste a log or a stack trace. LogLens isolates the failing lines, rates how serious the
            problem is and writes the GitHub issue for you.
          </p>
        </div>
        <div className="-mx-2 lg:mx-0">
          <Prism active={status === 'loading'} />
        </div>
      </section>

      {/* Console */}
      <section
        className="console overflow-hidden"
        data-state={consoleState}
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
      >
        <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
          <span
            className={`h-2 w-2 rounded-full transition-colors ${text ? 'bg-low' : 'bg-line-strong'}`}
            style={text ? { boxShadow: '0 0 12px #4fd6ff' } : undefined}
          />
          <span className="font-mono text-xs text-fg-faint">{statusText}</span>
        </div>

        <label htmlFor="log-input" className="sr-only">
          Log or stack trace
        </label>
        <textarea
          id="log-input"
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
          placeholder="Paste a log or stack trace here, or drop a .log file"
          spellCheck={false}
          className="block h-72 w-full resize-y bg-transparent px-6 py-5 font-mono text-[13px] leading-relaxed text-fg-muted placeholder:text-fg-faint/60 focus:outline-none"
        />

        <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-4">
          {status === 'loading' && (
            <div className="flex flex-1 items-center gap-3">
              <span className="h-2 w-2 animate-pulse-dot rounded-full bg-violet" />
              <span className="text-sm text-fg-muted">Analyzing log…</span>
              <button
                type="button"
                onClick={onCancel}
                className="ml-auto rounded-full px-4 py-2 text-sm text-fg-faint transition-colors hover:text-fg"
              >
                Cancel
              </button>
            </div>
          )}
          {status !== 'loading' && (
            <>
              <span className="text-sm text-fg-faint">Try an example:</span>
              {EXAMPLES.map((example) => (
                <button
                  key={example.label}
                  type="button"
                  onClick={() => {
                    setText(example.content);
                    setFileName(null);
                  }}
                  className="rounded-full border border-line px-3.5 py-1.5 text-sm text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
                >
                  {example.label}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-full border border-line-strong px-5 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-white/5"
                >
                  <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path
                      d="M6 8.5V1.5M3 4.5L6 1.5L9 4.5"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M1 10.5H11"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </svg>
                  Upload file
                </button>
                <button
                  type="button"
                  onClick={onAnalyze}
                  disabled={!canSubmit}
                  className="btn-photon rounded-full px-7 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Analyze log
                </button>
              </div>
            </>
          )}
        </div>
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
      </section>

      {status === 'error' && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-3 rounded-2xl border border-high/30 bg-high/8 px-5 py-4"
        >
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-high" />
          <div>
            <p className="text-sm text-fg">{error}</p>
            <p className="mt-1 text-sm text-fg-faint">
              Check that the analysis server is running, then try again.
            </p>
          </div>
        </div>
      )}

      {result && (
        <section className="mt-12 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-medium tracking-wide text-fg-faint">Result</h2>
            <Link
              to={`/analyses/${result.id}`}
              className="text-sm text-fg-muted transition-colors hover:text-fg"
            >
              Open full page →
            </Link>
          </div>
          <ReportView analysis={result} />
        </section>
      )}
    </div>
  );
}
