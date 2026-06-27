import type { CSSProperties } from 'react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';

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

  let sectionBorderClass = 'border-line focus-within:border-line-strong';
  if (dragging) {
    sectionBorderClass = 'border-signal';
  }

  let dotClass = 'bg-line-strong';
  if (text) {
    dotClass = 'bg-signal';
  }

  let titlebarText = 'ready';
  if (fileName) {
    titlebarText = `${fileName} · ${text.split('\n').length} lines`;
  } else if (text.length > 0) {
    titlebarText = `${text.split('\n').length} lines · ${text.length.toLocaleString()} chars`;
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="pt-4">
        <h1 className="font-head uppercase leading-none">
          <span
            className="block font-normal italic text-fg-faint"
            style={{
              fontSize: 'clamp(28px, 5vw, 42px)',
              animation: 'reveal-up 0.75s cubic-bezier(0.16,1,0.3,1) both',
              animationDelay: '80ms',
            }}
          >
            Find the
          </span>
          <span
            className="block font-extrabold"
            style={{
              fontSize: 'clamp(52px, 9vw, 80px)',
              animation: 'reveal-up 0.75s cubic-bezier(0.16,1,0.3,1) both',
              animationDelay: '200ms',
            }}
          >
            <span className="text-fg">Real </span>
            <span className="text-signal">Error.</span>
          </span>
        </h1>
        <p
          className="mt-5 max-w-[38ch] text-sm leading-relaxed text-fg-faint"
          style={{ animation: 'reveal-fade 0.6s ease-out both', animationDelay: '340ms' }}
        >
          Paste a log or stack trace. LogLens pinpoints the root cause, rates severity, and writes a
          bug report ready for GitHub.
        </p>
      </section>

      {/* Decorative animated log stream — purely visual, not interactive */}
      <LogStream />

      {/* Terminal input */}
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
        className={`overflow-hidden rounded border transition-colors ${sectionBorderClass}`}
      >
        {/* Titlebar */}
        <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-2.5">
          <span className={`h-1.5 w-1.5 rounded-full transition-colors ${dotClass}`} />
          <span className="font-mono text-[9px] tracking-[0.06em] text-fg-faint">
            {titlebarText}
          </span>
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
          {status === 'loading' && (
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
          )}
          {status !== 'loading' && (
            <>
              <span className="font-head text-[8px] font-semibold tracking-[0.2em] uppercase text-fg-faint">
                try:
              </span>
              {EXAMPLES.map((example) => (
                <button
                  key={example.label}
                  type="button"
                  onClick={() => {
                    setText(example.content);
                    setFileName(null);
                  }}
                  className="rounded-sm border border-line px-2 py-0.5 font-head text-[9px] font-semibold tracking-[0.1em] uppercase text-fg-faint transition-colors hover:border-line-strong hover:text-fg-muted"
                >
                  {example.label}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-sm border border-signal/40 bg-signal/10 px-3 py-1.5 font-head text-[10px] font-bold tracking-[0.1em] uppercase text-signal transition-colors hover:border-signal/70 hover:bg-signal/20"
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path
                      d="M6 8.5V1.5M3 4.5L6 1.5L9 4.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M1 10.5H11"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  Upload file
                </button>
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

// ─── LogStream ────────────────────────────────────────────────────────────────
// Decorative hero element: a loop of realistic-looking log lines that scrolls
// continuously. The lines are static data — nothing is fetched or processed.

interface LogLine {
  ts: string;
  level: 'INFO' | 'DEBUG' | 'WARN' | 'ERROR';
  msg: string;
}

const LOG_LINES: LogLine[] = [
  { ts: '14:23:01.042', level: 'INFO', msg: 'Application starting on port 8080' },
  { ts: '14:23:01.107', level: 'DEBUG', msg: 'Loading config from /etc/app/config.yaml' },
  { ts: '14:23:01.189', level: 'INFO', msg: 'Database connection pool initialized (max=20)' },
  { ts: '14:23:01.234', level: 'WARN', msg: 'Memory usage at 78% - consider scaling' },
  { ts: '14:23:01.301', level: 'ERROR', msg: 'Connection refused: postgres.svc.cluster:5432' },
  { ts: '14:23:01.312', level: 'ERROR', msg: 'Retry 1/3 failed - backoff 500ms' },
  { ts: '14:23:01.823', level: 'WARN', msg: 'Cache miss rate exceeding threshold (42%)' },
  { ts: '14:23:01.956', level: 'INFO', msg: 'Health check passed /api/health 200 OK' },
  { ts: '14:23:02.011', level: 'DEBUG', msg: 'GET /api/users?page=1 uid=a9f2c3d1' },
  { ts: '14:23:02.156', level: 'ERROR', msg: 'Unhandled exception in worker thread #4' },
  { ts: '14:23:02.157', level: 'ERROR', msg: 'NullPointerException at UserService.java:247' },
  { ts: '14:23:02.203', level: 'WARN', msg: 'Slow query: 2341ms  SELECT * FROM sessions' },
  { ts: '14:23:02.387', level: 'INFO', msg: 'Restarting degraded worker thread #4' },
  { ts: '14:23:02.501', level: 'INFO', msg: 'Circuit breaker OPEN for payments-service' },
  { ts: '14:23:02.678', level: 'DEBUG', msg: 'Token refreshed: user@company.com' },
  { ts: '14:23:02.801', level: 'WARN', msg: 'API rate limit: 983/1000 req/hour' },
  { ts: '14:23:02.934', level: 'ERROR', msg: 'Pod crash-loopbackoff: api-deploy-5cd8f' },
  { ts: '14:23:03.021', level: 'INFO', msg: 'Scaling deployment to 3 replicas' },
  { ts: '14:23:03.145', level: 'DEBUG', msg: 'Metrics flushed to prometheus:9090' },
  { ts: '14:23:03.289', level: 'WARN', msg: 'Disk usage at 91% on /var/log partition' },
];

function rowBgClass(level: LogLine['level']): string {
  if (level === 'ERROR') {
    return 'bg-high/[0.04]';
  }
  return '';
}

function errorGlow(level: LogLine['level']): CSSProperties | undefined {
  if (level === 'ERROR') {
    return { textShadow: '0 0 10px rgba(247,109,109,0.45)' };
  }
  return undefined;
}

function levelTextColor(level: LogLine['level']): string {
  if (level === 'ERROR') return 'text-high';
  if (level === 'WARN') return 'text-medium';
  if (level === 'INFO') return 'text-low/70';
  return 'text-fg-faint/40'; // DEBUG
}

function msgTextColor(level: LogLine['level']): string {
  if (level === 'ERROR') return 'text-high/75';
  if (level === 'WARN') return 'text-medium/60';
  if (level === 'DEBUG') return 'text-fg-faint/40';
  return 'text-fg-faint/70'; // INFO
}

function LogStream() {
  // Duplicate the lines so the scroll animation loops seamlessly.
  const doubled = [...LOG_LINES, ...LOG_LINES];

  return (
    <div
      className="relative h-44 overflow-hidden rounded-sm border border-line bg-ink-deep"
      style={{ animation: 'reveal-fade 0.6s ease-out both', animationDelay: '420ms' }}
    >
      {/* Top and bottom fade masks */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-14 bg-gradient-to-b from-ink-deep to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-14 bg-gradient-to-t from-ink-deep to-transparent" />

      {/* Horizontal scan line */}
      <div
        className="pointer-events-none absolute inset-x-0 z-20 h-px bg-signal/20"
        style={{ animation: 'scan-v 5s ease-in-out infinite' }}
      />

      {/* Scrolling log lines */}
      <div style={{ animation: 'scroll-logs 22s linear infinite' }}>
        {doubled.map((line, i) => (
          <div
            key={i}
            className={`flex items-baseline gap-3 px-4 py-[3px] font-mono text-[9px] leading-5 ${rowBgClass(line.level)}`}
          >
            <span className="shrink-0 tabular-nums text-fg-faint/30">{line.ts}</span>
            <span
              className={`w-[38px] shrink-0 font-bold ${levelTextColor(line.level)}`}
              style={errorGlow(line.level)}
            >
              {line.level}
            </span>
            <span className={msgTextColor(line.level)}>{line.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
