import { useRef } from 'react';

import { STREAM_TEXT } from '../content/stream';
import { useMotionPause } from '../hooks/useMotionPause';
import { buildStreamLines, type StreamLine } from '../lib/logStream';

const STREAM_LINES = buildStreamLines();

/**
 * Decoration behind the headline: log lines scrolling slowly upwards, one of them
 * marked as suspicious, and a scan line sweeping down. Hidden from screen readers.
 */
export function HeroLogStream() {
  const streamRef = useRef<HTMLDivElement>(null);
  useMotionPause(streamRef);

  return (
    <div ref={streamRef} className="hero-stream" aria-hidden="true">
      <div className="hero-stream-track">
        <StreamCopy />
        <StreamCopy />
        <StreamCopy />
      </div>
      <span className="hero-scanline" />
    </div>
  );
}

/** One copy of the lines; identical copies back to back make the loop seamless. */
function StreamCopy() {
  return (
    <div>
      {STREAM_LINES.map((line, index) => (
        <StreamRow key={index} line={line} />
      ))}
    </div>
  );
}

function StreamRow({ line }: { line: StreamLine }) {
  if (!line.flagged) return <div className="hero-stream-line">{line.text}</div>;
  return (
    <div className="hero-stream-line hero-stream-flagged">
      <span className="hero-stream-tag">{STREAM_TEXT.flagTag}</span>
      {line.text}
    </div>
  );
}
