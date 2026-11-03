import { REPORT_TEXT } from '../content/report';
import { isFailure } from '../lib/format';

/**
 * The key lines of the log as strips cut from the printout, numbered when the log is known,
 * with the failures marked by the highlighter. Long lines scroll sideways inside the strips
 * only, so the list is one keyboard stop that can be scrolled with the arrow keys.
 */
export function FailingLines({
  lines,
  lineNumbers,
}: {
  lines: string[];
  lineNumbers?: Map<string, number>;
}) {
  return (
    <ol className="report-strips" tabIndex={0} aria-label={REPORT_TEXT.failingLinesLabel}>
      {lines.map((line, index) => (
        <li key={index} className="report-strip" data-failing={isFailure(line)}>
          <span className="report-strip-number">{lineNumbers?.get(line) ?? ''}</span>
          <span className="report-strip-text">{line}</span>
        </li>
      ))}
    </ol>
  );
}
