import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { LensStage } from '../components/LensStage';
import { ReportView } from '../components/ReportView';
import { api } from '../lib/api';
import { EXAMPLES } from '../lib/examples';
import { findLineNumbers } from '../lib/format';
import type { AnalysisRecord } from '../lib/types';

type Status = 'idle' | 'loading' | 'error';

const MIN_EDITOR_LINES = 20;

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
  const longestLine = Math.max(0, ...text.split('
").map((l) => l.length));

  // Line numbers of the failing lines: marked with the highlighter in the editor gutter.
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
      {/* Hero */}
      <section className="grid items-center gap-10 pt-6 pb-16 lg:grid-cols-[1fr_1.1fr] lg:pt-10">
        <div>
          <h1 className="text-[clamp(2.9rem,7.4vw,6.2rem)] leading-[0.92] font-extrabold tracking-tight uppercase [font-stretch:125%]">
            Find
            <br />
            the line
            <br />
            that <span className="marker">broke.</span>
          </h1>
          <p className="mt-8 max-w-md text-lg leading-relaxed text-chalk">
            Paste a log or a stack trace. LogLens marks the failing lines, rates how serious it is
            and drafts the GitHub issue.
          </p>
        </div>
        <LensStage />
      </section>

      {/* Workbench */}
      <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Left: the log, on green bar paper */}
        <section
          className={`relative flex min-w-0 flex-col bg-paper text-ink ${dragging ? 'outline-4 outline-marker outline-dashed -outline-offset-8' : ''}`}
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink px-5 py-3">
            <span className="font-mono text-sm font-bold">
              {editorTitle}
              {lineCount > 0 && ` · ${lineCount} lines`}
            </span>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="text-ink-soft">Examples:</span>
              {EXAMPLES.map((example) => (
                <button
                  key={example.label}
                  type="button"
                  onClick={() => {
                    setText(example.content);
                    setFileName(null);
                  }}
                  className="font-bold underline decoration-2 underline-offset-4 hover:bg-marker"
                >
                  {example.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[30rem] overflow-auto">
            <div className="bands flex min-h-full font-mono text-[14px] leading-[22px]">
              <ol
                className="sticky left-0 z-10 shrink-0 border-r-2 border-ink bg-paper text-right text-ink-soft select-none"
                aria-hidden="true"
              >
                {gutterNumbers.map((n) => (
                  <li
                    key={n}
                    className={`px-3 ${failingLines.has(n) ? 'bg-marker font-bold text-pen' : ''}`}
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
                placeholder="Paste a log or stack trace here, or drop a .log file."
                spellCheck={false}
                wrap="off"
                rows={Math.max(lineCount, MIN_EDITOR_LINES)}
                // The box grows with the longest line so the scroll area can reach its end.
                style={{ minWidth: `${longestLine + 4}ch` }}
                className="block min-w-0 flex-1 resize-none overflow-hidden bg-transparent p-0 pl-4 whitespace-pre text-ink placeholder:text-ink-soft focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t-2 border-ink px-5 py-4">
            <button
              type="button"
              onClick={onAnalyze}
              disabled={!canSubmit}
              className="btn-ink px-6 py-2.5 text-sm font-bold tracking-wide uppercase disabled:cursor-not-allowed disabled:opacity-40"
            >
              Analyze log
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-paper px-5 py-2.5 text-sm font-bold tracking-wide uppercase"
            >
              Open file
            </button>
            {status === 'loading' && (
              <button
                type="button"
                onClick={onCancel}
                className="text-sm font-bold underline decoration-2 underline-offset-4 hover:bg-marker"
              >
                Cancel
              </button>
            )}
            <span className="ml-auto text-xs text-ink-soft">Ctrl + Enter to analyze</span>
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

        {/* Right: the review, in red pen */}
        <section
          className="min-w-0 bg-felt-2 p-7 lg:max-h-[40.5rem] lg:overflow-y-auto"
          aria-live="polite"
        >
          {status === 'loading' && <p className="caret text-lg text-chalk">Reading the log</p>}

          {status === 'error' && (
            <div role="alert" className="border-l-4 border-marker pl-4">
              <p className="text-lg font-bold">Analysis failed</p>
              <p className="mt-1 text-chalk">{error}</p>
            </div>
          )}

          {status === 'idle' && result && (
            <div>
              <ReportView analysis={result} />
              <Link
                to={`/analyses/${result.id}`}
                className="mt-8 inline-block font-bold underline decoration-2 underline-offset-4 hover:bg-marker hover:text-ink"
              >
                Open full page
              </Link>
            </div>
          )}

          {status === 'idle' && !result && (
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight uppercase [font-stretch:125%]">
                Review
              </h2>
              <p className="mt-3 text-lg text-chalk">
                Nothing analysed yet. Run a log and the review appears here:
              </p>
              <ul className="mt-5 space-y-3 text-lg">
                <li>
                  <span className="marker">Failing lines</span> with their line numbers
                </li>
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
