import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { ReportView } from '../components/ReportView';
import { api } from '../lib/api';
import { EXAMPLES } from '../lib/examples';
import { findLineNumbers } from '../lib/format';
import type { AnalysisRecord } from '../lib/types';

type Status = 'idle' | 'loading' | 'error';

const MIN_EDITOR_LINES = 22;

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
  const lineCount = text === '' ? 0 : text.split('\n').length;

  // Line numbers of the failing lines, shown in red in the editor gutter.
  const failingLines = new Set<number>();
  if (result && result.rawLog === text) {
    for (const lineNumber of findLineNumbers(result.rawLog, result.report.keyLines).values()) {
      failingLines.add(lineNumber);
    }
  }

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

  const gutterNumbers = Array.from(
    { length: Math.max(lineCount, MIN_EDITOR_LINES) },
    (_, i) => i + 1,
  );

  let editorTitle = 'Log';
  if (fileName) {
    editorTitle = fileName;
  }

  return (
    <div>
      <h1 className="max-w-3xl text-[clamp(1.7rem,3.4vw,2.4rem)] leading-tight font-semibold tracking-tight">
        Paste a log, get the lines that matter.
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
        LogLens picks out the failing lines, rates the severity, lists probable causes and drafts
        the GitHub issue.
      </p>

      <div className="mt-8 grid border border-rule-strong bg-panel lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Left: the log */}
        <section
          className={`flex min-w-0 flex-col border-b border-rule-strong lg:border-r lg:border-b-0 ${dragging ? 'bg-paper' : ''}`}
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-4 py-2.5">
            <span className="font-mono text-xs text-muted">
              {editorTitle}
              {lineCount > 0 && ` · ${lineCount} lines`}
            </span>
            <div className="flex items-center gap-4 text-[13px]">
              <span className="text-faint">Examples</span>
              {EXAMPLES.map((example) => (
                <button
                  key={example.label}
                  type="button"
                  onClick={() => {
                    setText(example.content);
                    setFileName(null);
                  }}
                  className="text-ink underline underline-offset-4 hover:no-underline"
                >
                  {example.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[28rem] overflow-auto">
            <div className="flex min-h-full font-mono text-[12.5px] leading-5">
              <ol
                className="sticky left-0 shrink-0 border-r border-rule bg-paper py-3 text-right text-faint select-none"
                aria-hidden="true"
              >
                {gutterNumbers.map((n) => (
                  <li
                    key={n}
                    className={`px-3 ${failingLines.has(n) ? 'bg-high font-medium text-paper' : ''}`}
                  >
                    {n}
                  </li>
                ))}
              </ol>
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
                placeholder="Paste a log or stack trace, or drop a .log file here."
                spellCheck={false}
                wrap="off"
                rows={Math.max(lineCount, MIN_EDITOR_LINES)}
                className="block min-w-0 flex-1 resize-none overflow-hidden bg-transparent py-3 pl-4 whitespace-pre text-ink placeholder:text-faint focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-rule px-4 py-3">
            <button
              type="button"
              onClick={onAnalyze}
              disabled={!canSubmit}
              className="bg-ink px-5 py-2 text-sm font-medium text-paper hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              Analyze log
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="border border-rule-strong px-4 py-2 text-sm font-medium hover:bg-paper"
            >
              Open file
            </button>
            {status === 'loading' && (
              <button
                type="button"
                onClick={onCancel}
                className="text-sm text-muted underline underline-offset-4 hover:text-ink"
              >
                Cancel
              </button>
            )}
            <span className="ml-auto text-xs text-faint">Ctrl + Enter to analyze</span>
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

        {/* Right: the analysis */}
        <section className="min-w-0 p-6 lg:max-h-[36.5rem] lg:overflow-y-auto" aria-live="polite">
          {status === 'loading' && <p className="caret text-[15px] text-muted">Analyzing log</p>}

          {status === 'error' && (
            <div role="alert" className="border-l-2 border-high pl-4">
              <p className="text-[15px] font-medium text-high">Analysis failed</p>
              <p className="mt-1 text-[15px] text-muted">{error}</p>
            </div>
          )}

          {status === 'idle' && result && (
            <div>
              <ReportView analysis={result} />
              <Link
                to={`/analyses/${result.id}`}
                className="mt-8 inline-block text-sm text-muted underline underline-offset-4 hover:text-ink"
              >
                Open full page
              </Link>
            </div>
          )}

          {status === 'idle' && !result && (
            <div>
              <h2 className="text-[13px] font-semibold">Analysis</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">
                Nothing analysed yet. After you run a log, this panel shows:
              </p>
              <ul className="mt-4 space-y-2 text-[15px]">
                <li>The failing lines, with their line numbers in the log</li>
                <li>Severity and category</li>
                <li>Probable causes and debug steps</li>
                <li>A GitHub issue ready to copy</li>
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
