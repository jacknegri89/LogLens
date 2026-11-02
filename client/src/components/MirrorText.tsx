import type { RefObject } from 'react';

import { MIN_EDITOR_ROWS } from '../lib/format';

/**
 * Invisible copy of the text. It sizes the box and tells the gutter how tall each
 * wrapped line is, so the line numbers stay beside their lines.
 */
export function MirrorText({
  text,
  mirrorRef,
}: {
  text: string;
  mirrorRef: RefObject<HTMLDivElement | null>;
}) {
  const lines = text.split('\n');
  while (lines.length < MIN_EDITOR_ROWS) lines.push('');

  return (
    <div
      ref={mirrorRef}
      aria-hidden="true"
      className="invisible pl-4 whitespace-pre-wrap [overflow-wrap:anywhere]"
    >
      {lines.map((line, i) => (
        <div key={i}>{line === '' ? ' ' : line}</div>
      ))}
    </div>
  );
}
