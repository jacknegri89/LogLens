export interface TextPiece {
  text: string;
  marked: boolean;
}

const MAX_MARKS = 30;

function findRanges(lowerText: string, terms: readonly string[]): [number, number][] {
  const ranges: [number, number][] = [];
  for (const term of terms) {
    let at = lowerText.indexOf(term);
    while (at !== -1 && ranges.length < MAX_MARKS) {
      ranges.push([at, at + term.length]);
      at = lowerText.indexOf(term, at + term.length);
    }
  }
  return ranges.sort((first, second) => first[0] - second[0]);
}

function mergeRanges(ranges: [number, number][]): [number, number][] {
  const merged: [number, number][] = [];
  for (const [start, end] of ranges) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

/** Splits a text into plain and marked pieces, marking every case-insensitive hit of the terms. */
export function splitHighlights(text: string, terms: readonly string[]): TextPiece[] {
  if (terms.length === 0) return [{ text, marked: false }];
  const pieces: TextPiece[] = [];
  let cursor = 0;
  for (const [start, end] of mergeRanges(findRanges(text.toLowerCase(), terms))) {
    if (start > cursor) pieces.push({ text: text.slice(cursor, start), marked: false });
    pieces.push({ text: text.slice(start, end), marked: true });
    cursor = end;
  }
  if (cursor < text.length) pieces.push({ text: text.slice(cursor), marked: false });
  return pieces;
}
