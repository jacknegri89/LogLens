import { WORKBENCH_EXPLORER_TEXT } from '../../content/workbenchExplorer';
import { useText } from '../../i18n/useText';

interface QueryBarProps {
  value: string;
  onChange: (value: string) => void;
  focusFaults: boolean;
  onFocusFaultsChange: (on: boolean) => void;
  shown: number;
  total: number;
  unreadParts: readonly string[];
}

/** The search box, its match count, the Focus faults switch and a one-line syntax hint. */
export function QueryBar(props: QueryBarProps) {
  const text = useText(WORKBENCH_EXPLORER_TEXT).explorer;
  const unread = props.unreadParts.length > 0;
  let hint = text.syntaxHint;
  if (unread) {
    hint = text.unreadHint(props.unreadParts.join(' '));
  }

  return (
    <div className="wbx-querybar">
      <div className="wbx-query-row">
        <SearchField value={props.value} onChange={props.onChange} />
        <button
          type="button"
          className="wbx-toggle"
          aria-pressed={props.focusFaults}
          onClick={() => props.onFocusFaultsChange(!props.focusFaults)}
        >
          {text.focusFaults}
        </button>
        <p className="wbx-count" aria-live="polite">
          {text.matchCount(props.shown, props.total)}
        </p>
      </div>
      <p id="wbx-query-help" className="wbx-help" data-warning={unread || undefined}>
        {hint}
      </p>
    </div>
  );
}

function SearchField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const text = useText(WORKBENCH_EXPLORER_TEXT).explorer;
  return (
    <div className="wbx-search">
      <label htmlFor="wbx-query" className="sr-only">
        {text.searchLabel}
      </label>
      <input
        id="wbx-query"
        type="search"
        className="wbx-search-input"
        value={value}
        placeholder={text.searchPlaceholder}
        spellCheck={false}
        autoComplete="off"
        aria-describedby="wbx-query-help"
        onChange={(event) => onChange(event.target.value)}
      />
      {value !== '' && (
        <button
          type="button"
          className="wbx-search-clear"
          aria-label={text.clearSearch}
          onClick={() => onChange('')}
        >
          ×
        </button>
      )}
    </div>
  );
}
