import { memo } from 'react';

import type { ParsedLine } from '../../types';
import { splitHighlights } from '../query/highlight';

const MAX_SHOWN_CHARACTERS = 2000;

export interface LineRowProps {
  line: ParsedLine;
  row: number;
  rowCount: number;
  time: string;
  highlights: readonly string[];
  selected: boolean;
  active: boolean;
  bookmarked: boolean;
  bookmarkedLabel: string;
  onChoose: (lineIndex: number) => void;
}

/** A JSON line shows whole (its message alone would hide the fields); a text line without time and level prefix. */
function shownText(line: ParsedLine): string {
  let text = line.message;
  if (line.raw.trimStart().startsWith('{')) {
    text = line.raw;
  }
  return text.slice(0, MAX_SHOWN_CHARACTERS);
}

function Highlighted({ text, terms }: { text: string; terms: readonly string[] }) {
  return splitHighlights(text, terms).map((piece, position) => {
    if (piece.marked) {
      return <mark key={position}>{piece.text}</mark>;
    }
    return piece.text;
  });
}

/** One log line in the list. Every value is rendered as text: log content is never HTML. */
export const LineRow = memo(function LineRow(props: LineRowProps) {
  const { line, row, rowCount, selected, active, bookmarked } = props;
  return (
    <div
      role="option"
      id={`wbx-line-${line.index}`}
      aria-selected={selected}
      aria-posinset={row + 1}
      aria-setsize={rowCount}
      className="wbx-row"
      data-fault={line.isFault || undefined}
      data-active={active || undefined}
      data-detail={(line.timestamp === null && line.level === null) || undefined}
      onClick={() => props.onChoose(line.index)}
    >
      <span className="wbx-star">
        {bookmarked && <span aria-hidden="true">★</span>}
        {bookmarked && <span className="sr-only">{props.bookmarkedLabel}</span>}
      </span>
      <span className="wbx-time">{props.time || '—'}</span>
      <span className="wbx-level" data-level={line.level ?? undefined}>
        {line.level ?? ''}
      </span>
      <span className="wbx-service">{line.service ?? ''}</span>
      <span className="wbx-message">
        <Highlighted text={shownText(line)} terms={props.highlights} />
      </span>
    </div>
  );
});
