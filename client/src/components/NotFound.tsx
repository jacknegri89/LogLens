import { NOT_FOUND_TEXT } from '../content/layout';

/** Shown for any address that does not match a page. */
export function NotFound() {
  return (
    <div className="py-16">
      <p className="font-mono text-lg font-bold text-chalk">{NOT_FOUND_TEXT.code}</p>
      <h1 className="mt-2 text-4xl font-extrabold uppercase [font-stretch:125%]">
        {NOT_FOUND_TEXT.titleStart} <span className="marker">{NOT_FOUND_TEXT.titleMarked}</span>
      </h1>
    </div>
  );
}
