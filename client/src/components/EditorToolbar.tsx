import { ANALYZE_TEXT } from '../content/analyze';
import { OpenFileButton } from './FileInput';

export interface EditorToolbarProps {
  canSubmit: boolean;
  loading: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  onFileLoad: (file: File) => void;
}

/** The buttons under the editor: analyze, open a file, cancel while loading. */
export function EditorToolbar({
  canSubmit,
  loading,
  onSubmit,
  onCancel,
  onFileLoad,
}: EditorToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-t-2 border-ink px-5 py-4">
      <AnalyzeButton canSubmit={canSubmit} onSubmit={onSubmit} />
      <OpenFileButton onFileLoad={onFileLoad} />
      {loading && <CancelButton onCancel={onCancel} />}
      <span className="ml-auto text-xs text-ink-soft">{ANALYZE_TEXT.shortcutHint}</span>
    </div>
  );
}

function AnalyzeButton({ canSubmit, onSubmit }: { canSubmit: boolean; onSubmit: () => void }) {
  return (
    <button
      type="button"
      onClick={onSubmit}
      disabled={!canSubmit}
      className="btn-ink px-6 py-2.5 text-sm font-bold tracking-wide uppercase disabled:cursor-not-allowed disabled:opacity-40"
    >
      {ANALYZE_TEXT.analyzeButton}
    </button>
  );
}

function CancelButton({ onCancel }: { onCancel: () => void }) {
  return (
    <button
      type="button"
      onClick={onCancel}
      className="text-sm font-bold underline decoration-2 underline-offset-4 hover:bg-marker"
    >
      {ANALYZE_TEXT.cancelButton}
    </button>
  );
}
