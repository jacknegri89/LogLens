import { HISTORY_TEXT } from '../content/history';

/** The drawer's front: huge title, a short line about it and the count as a tab. */
export function HistoryHeading({ count }: { count: number | null }) {
  return (
    <header className="history-heading">
      <p className="history-eyebrow">{HISTORY_TEXT.eyebrow}</p>
      <h1 className="history-title">
        {HISTORY_TEXT.titleStart} <span className="marker">{HISTORY_TEXT.titleMarked}</span>
      </h1>
      <div className="history-heading-foot">
        <p className="history-intro">{HISTORY_TEXT.intro}</p>
        {count !== null && count > 0 && (
          <p className="history-count">
            <span>{HISTORY_TEXT.savedCount(count)}</span>
          </p>
        )}
      </div>
    </header>
  );
}
