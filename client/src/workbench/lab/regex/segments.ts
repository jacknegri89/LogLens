export interface MatchRange {
  start: number;
  end: number;
}

export interface TextSegment {
  text: string;
  matched: boolean;
}

/** Cuts a line into plain and matched pieces, so it can be drawn without ever using HTML. */
export function splitSegments(text: string, ranges: readonly MatchRange[]): TextSegment[] {
  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const range of ranges) {
    const start = Math.max(range.start, cursor);
    const end = Math.min(range.end, text.length);
    if (end <= start) {
      continue;
    }
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), matched: false });
    }
    segments.push({ text: text.slice(start, end), matched: true });
    cursor = end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), matched: false });
  }
  return segments;
}
