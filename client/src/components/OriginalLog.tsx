import { DETAIL_TEXT } from '../content/detail';

/** The raw log, folded away so the report stays on top. */
export function OriginalLog({ rawLog }: { rawLog: string }) {
  return (
    <details>
      <summary className="flex cursor-pointer items-center justify-between gap-4 border-b-2 border-chalk-dim pb-2 text-sm font-extrabold tracking-widest uppercase select-none [font-stretch:125%] hover:text-marker">
        {DETAIL_TEXT.originalLog}
        <span className="font-mono text-xs font-normal tracking-normal normal-case">
          {DETAIL_TEXT.lineCount(rawLog.split('\n').length)}
        </span>
      </summary>
      <pre className="bands mt-4 overflow-x-auto p-4 font-mono text-[13.5px] leading-[22px] text-ink">
        {rawLog}
      </pre>
    </details>
  );
}
