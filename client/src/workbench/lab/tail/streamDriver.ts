import { MAX_TAIL_LINES, nextDelayMs } from './scenarios';

export interface StreamSink {
  /** Called once per line, with how many lines the stream has added so far. */
  onLine: (line: string, appended: number) => void;
  /** Called once when the stream ends by itself; not after `stop`. */
  onEnd: (reason: 'finished' | 'limit') => void;
}

export interface Timers {
  setTimer: (callback: () => void, delayMs: number) => number;
  clearTimer: (handle: number) => void;
}

export interface StreamDriver {
  /** Starts a stream. Returns false, and does nothing, while another stream is running. */
  start: (lines: readonly string[], sink: StreamSink) => boolean;
  /** Stops the stream. Safe to call at any time and more than once. */
  stop: () => void;
  isRunning: () => boolean;
}

export const BROWSER_TIMERS: Timers = {
  setTimer: (callback, delayMs) => window.setTimeout(callback, delayMs),
  clearTimer: (handle) => window.clearTimeout(handle),
};

interface DriverState {
  handle: number | null;
  queue: string[];
  appended: number;
  /** The lines given were more than the cap allows, so the stream ends by the limit. */
  truncated: boolean;
  sink: StreamSink | null;
}

function release(state: DriverState, timers: Timers): void {
  if (state.handle !== null) timers.clearTimer(state.handle);
  state.handle = null;
  state.queue = [];
  state.sink = null;
}

function finish(state: DriverState, timers: Timers, reason: 'finished' | 'limit'): void {
  const { sink } = state;
  release(state, timers);
  sink?.onEnd(reason);
}

function step(state: DriverState, timers: Timers, nextDelay: () => number): void {
  const line = state.queue.shift();
  const { sink } = state;
  state.handle = null;
  if (line === undefined || !sink) return finish(state, timers, 'finished');
  state.appended += 1;
  sink.onLine(line, state.appended);
  // The sink may have stopped the stream from inside onLine.
  if (state.sink !== sink) return;
  if (state.queue.length === 0)
    return finish(state, timers, state.truncated ? 'limit' : 'finished');
  state.handle = timers.setTimer(() => step(state, timers, nextDelay), nextDelay());
}

/**
 * Plays lines one by one, 150 to 400 ms apart. At most one stream runs at a time, and the
 * timer is always cleared when the stream stops, ends or is replaced. Timers are a parameter
 * so tests can drive the clock.
 */
export function createStreamDriver(
  timers: Timers = BROWSER_TIMERS,
  nextDelay: () => number = () => nextDelayMs(Math.random),
  cap: number = MAX_TAIL_LINES,
): StreamDriver {
  const state: DriverState = { handle: null, queue: [], appended: 0, truncated: false, sink: null };

  return {
    start(lines, sink) {
      if (state.sink) return false;
      state.queue = lines.slice(0, cap);
      state.truncated = lines.length > cap;
      state.appended = 0;
      state.sink = sink;
      state.handle = timers.setTimer(() => step(state, timers, nextDelay), nextDelay());
      return true;
    },
    stop: () => release(state, timers),
    isRunning: () => state.sink !== null,
  };
}
