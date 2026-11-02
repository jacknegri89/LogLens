import { ANALYZE_TEXT } from '../content/analyze';

/** The buttons under the editor: analyze, open a file, cancel while loading. */
export function EditorToolbar({
  canSubmit,
  loading,
  onSubmit,
  onCancel,
  onOpenFile,
}: {
  canSubmit: boolean;
  loading: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  onOpenFile: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-t-2 border-ink px-5 py-4">
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className="btn-ink px-6 py-2.5 text-sm font-bold tracking-wide uppercase disabled:cursor-not-allowed disabled:opacity-40"
      >
        {ANALYZE_TEXT.analyzeButton}
      </button>
      <button
        type="button"
        onClick={onOpenFile}
        className="btn-paper px-5 py-2.5 text-sm font-bold tracking-wide uppercase"
      >
        {ANALYZE_TEXT.openFileButton}
      </button>
      {loading && <CancelButton onCancel={onCancel} />}
      <span className="ml-auto text-xs text-ink-soft">{ANALYZE_TEXT.shortcutHint}</span>
    </div>
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
