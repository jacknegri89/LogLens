import type { ParsedLine } from '../../types';

/** A line with neither time nor level right after a fault belongs to it: a frame, a cause, a code line. */
function continuesFault(line: ParsedLine): boolean {
  return line.timestamp === null && line.level === null;
}

/**
 * Marks, for each position in `lines`, whether "Focus faults" keeps it: every fault line and the
 * stack trace or detail lines that follow it.
 */
export function faultFocusMarks(lines: readonly ParsedLine[]): Uint8Array {
  const marks = new Uint8Array(lines.length);
  let insideFault = false;
  lines.forEach((line, position) => {
    insideFault = line.isFault || (insideFault && continuesFault(line));
    marks[position] = insideFault ? 1 : 0;
  });
  return marks;
}
