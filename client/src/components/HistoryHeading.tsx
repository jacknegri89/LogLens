import { HISTORY_TEXT } from '../content/history';

export function HistoryHeading({ count }: { count: number | null }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 pt-4">
      <h1 className="text-[clamp(2.4rem,6vw,4.6rem)] leading-[0.95] font-extrabold tracking-tight uppercase [font-stretch:125%]">
        {HISTORY_TEXT.titleStart} <span className="marker">{HISTORY_TEXT.titleMarked}</span>
      </h1>
      {count !== null && count > 0 && (
        <span className="font-mono text-base font-bold text-chalk">
          {HISTORY_TEXT.savedCount(count)}
        </span>
      )}
    </div>
  );
}
