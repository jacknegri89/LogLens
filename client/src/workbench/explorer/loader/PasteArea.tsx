import { WORKBENCH_EXPLORER_TEXT } from '../../../content/workbenchExplorer';
import { useText } from '../../../i18n/useText';
import { usePasteDraft } from './usePasteDraft';

/** A compact paste box: the log itself is read in the Explorer, not here. */
export function PasteArea({ onLoaded }: { onLoaded: () => void }) {
  const text = useText(WORKBENCH_EXPLORER_TEXT).loader;
  const paste = usePasteDraft(onLoaded);

  return (
    <div className="wbx-paste">
      <label htmlFor="wbx-paste-input" className="wbx-label">
        {text.pasteLabel}
      </label>
      <textarea
        id="wbx-paste-input"
        className="wbx-textarea"
        rows={3}
        value={paste.draft}
        placeholder={text.pastePlaceholder}
        spellCheck={false}
        onChange={(event) => paste.setDraft(event.target.value)}
        onPaste={paste.loadPasted}
        onKeyDown={paste.loadOnShortcut}
      />
      <button
        type="button"
        className="wbx-button"
        disabled={paste.draft.trim() === ''}
        onClick={paste.loadDraft}
      >
        {text.loadPasted}
      </button>
    </div>
  );
}
