import { HISTORY_TEXT } from '../content/history';
import { useText } from '../i18n/useText';

/** The drawer's front: huge title, a short line about it and the count as a tab. */
export function HistoryHeading({ count }: { count: number | null }) {
  const text = useText(HISTORY_TEXT);
  return (
    <header className="history-heading">
      <h1 className="history-title">
        {text.titleStart} <span className="marker">{text.titleMarked}</span>
      </h1>
      <div className="history-heading-foot">
        <p className="history-intro">{text.intro}</p>
        {count !== null && count > 0 && (
          <p className="history-count">
            <span>{text.savedCount(count)}</span>
          </p>
        )}
      </div>
    </header>
  );
}
