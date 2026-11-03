import { ANALYZE_TEXT } from '../content/analyze';
import { useText } from '../i18n/useText';
import { AnonymizeToggle } from './AnonymizeToggle';
import { OpenFileButton } from './FileInput';

export interface EditorToolbarProps {
  canSubmit: boolean;
  loading: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  onClear: () => void;
  canClear: boolean;
  onFileLoad: (file: File) => void;
  anonymize: boolean;
  onAnonymizeChange: (enabled: boolean) => void;
  /** Counts from the last anonymized send, or null when nothing was anonymized. */
  anonymizedCounts: Record<string, number> | null;
}

/** The buttons under the editor: analyze, open a file, cancel while loading. */
export function EditorToolbar({
  canSubmit,
  loading,
  onSubmit,
  onCancel,
  onClear,
  canClear,
  onFileLoad,
  anonymize,
  onAnonymizeChange,
  anonymizedCounts,
}: EditorToolbarProps) {
  const text = useText(ANALYZE_TEXT);
  return (
    <div className="flex flex-wrap items-center gap-4 border-t-2 border-ink bg-band/50 px-5 py-4">
      <AnalyzeButton canSubmit={canSubmit} onSubmit={onSubmit} />
      <OpenFileButton onFileLoad={onFileLoad} />
      {canClear && <ClearButton onClear={onClear} />}
      <AnonymizeToggle checked={anonymize} onChange={onAnonymizeChange} />
      {loading && <CancelButton onCancel={onCancel} />}
      <span className="ml-auto font-mono text-xs text-ink-soft">{text.shortcutHint}</span>
      <div role="status" className="basis-full text-sm font-bold empty:hidden">
        {anonymizedCounts && text.anonymizedNotice(anonymizedCounts)}
      </div>
    </div>
  );
}

function AnalyzeButton({ canSubmit, onSubmit }: { canSubmit: boolean; onSubmit: () => void }) {
  const text = useText(ANALYZE_TEXT);
  return (
    <button
      type="button"
      onClick={onSubmit}
      disabled={!canSubmit}
      className="btn-ink px-6 py-2.5 text-sm font-bold tracking-wide uppercase disabled:cursor-not-allowed disabled:opacity-40"
    >
      {text.analyzeButton}
    </button>
  );
}

function ClearButton({ onClear }: { onClear: () => void }) {
  const text = useText(ANALYZE_TEXT);
  return (
    <button
      type="button"
      onClick={onClear}
      className="btn-paper px-5 py-2.5 text-sm font-bold tracking-wide uppercase"
    >
      {text.clearButton}
    </button>
  );
}

function CancelButton({ onCancel }: { onCancel: () => void }) {
  const text = useText(ANALYZE_TEXT);
  return (
    <button
      type="button"
      onClick={onCancel}
      className="text-sm font-bold underline decoration-2 underline-offset-4 hover:bg-marker"
    >
      {text.cancelButton}
    </button>
  );
}
