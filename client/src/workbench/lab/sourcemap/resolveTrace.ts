import { parseStackTrace, type StackFrame } from './parseStackTrace';
import { resolvePosition, type Resolution } from './resolvePosition';
import type { LoadedSourceMap } from './sourceMap';

export interface ResolvedFrame {
  frame: StackFrame;
  resolution: Resolution;
}

/** A trace longer than this is cut, so a pasted log cannot fill the page with cards. */
export const MAX_RESOLVED_FRAMES = 200;

export function resolveFrame(map: LoadedSourceMap, frame: StackFrame): ResolvedFrame {
  if (frame.line === null || frame.column === null) {
    return { frame, resolution: { status: 'unresolved', reason: 'noPosition' } };
  }
  return { frame, resolution: resolvePosition(map, frame.line, frame.column) };
}

/** Every frame of the pasted trace, in order, resolved or not. */
export function resolveTrace(map: LoadedSourceMap, trace: string): ResolvedFrame[] {
  return parseStackTrace(trace)
    .slice(0, MAX_RESOLVED_FRAMES)
    .map((frame) => resolveFrame(map, frame));
}
