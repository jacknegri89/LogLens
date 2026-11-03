import { useRef } from 'react';

import { STREAM_TEXT } from '../content/stream';
import { useMotionPause } from '../hooks/useMotionPause';
import { buildStreamLines, type StreamLine } from '../lib/logStream';

function startAt(lines: StreamLine[], offset: number): StreamLine[] {
  return [...lines.slice(offset), ...lines.slice(0, offset)];
}

const STREAM_LINES = buildStreamLines();
/** Each column starts at a different line, so the three columns never look copied. */
const COLUMNS = [0, 7, 12].map((offset) => startAt(STREAM_LINES, offset));

/**
 * Decoration behind the headline: a wall of log lines on a plane tilted away under
 * the lamp, scrolling up in three columns at different speeds. Hidden from screen readers.
 */
export function HeroLogStream() {
  const wallRef = useRef<HTMLDivElement>(null);
  useMotionPause(wallRef);

  return (
    <div ref={wallRef} className="hero-wall" aria-hidden="true">
      <div className="hero-wall-plane">
        {COLUMNS.map((lines, index) => (
          <WallColumn key={index} lines={lines} />
        ))}
      </div>
    </div>
  );
}

/** Three identical copies back to back make the loop seamless. */
function WallColumn({ lines }: { lines: StreamLine[] }) {
  const copy = lines.map((line, index) => <WallRow key={index} line={line} />);
  return (
    <div className="hero-wall-column">
      <div className="hero-wall-track">
        <div>{copy}</div>
        <div>{copy}</div>
        <div>{copy}</div>
      </div>
    </div>
  );
}

function WallRow({ line }: { line: StreamLine }) {
  if (!line.flagged) return <div className="hero-wall-line">{line.text}</div>;
  return (
    <div className="hero-wall-line hero-wall-flagged">
      <span className="hero-wall-tag">{STREAM_TEXT.flagTag}</span>
      {line.text}
    </div>
  );
}
