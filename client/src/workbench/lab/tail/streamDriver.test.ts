import { describe, expect, it } from 'vitest';

import { createStreamDriver, type StreamSink, type Timers } from './streamDriver';

/** A clock that only moves when the test says so. */
function createFakeTimers() {
  const pending = new Map<number, { callback: () => void; delayMs: number }>();
  let nextHandle = 1;
  const timers: Timers = {
    setTimer: (callback, delayMs) => {
      pending.set(nextHandle, { callback, delayMs });
      return nextHandle++;
    },
    clearTimer: (handle) => {
      pending.delete(handle);
    },
  };
  function fireNext(): number | null {
    const first = [...pending.entries()][0];
    if (!first) return null;
    pending.delete(first[0]);
    first[1].callback();
    return first[1].delayMs;
  }
  return { timers, fireNext, pendingCount: () => pending.size };
}

function createRecorder() {
  const lines: string[] = [];
  const ends: string[] = [];
  const sink: StreamSink = {
    onLine: (line) => lines.push(line),
    onEnd: (reason) => ends.push(reason),
  };
  return { lines, ends, sink };
}

describe('createStreamDriver', () => {
  it('plays the lines in order, one per timer, and ends by itself', () => {
    const clock = createFakeTimers();
    const recorder = createRecorder();
    const driver = createStreamDriver(clock.timers, () => 200);
    expect(driver.start(['a', 'b', 'c'], recorder.sink)).toBe(true);
    expect(driver.isRunning()).toBe(true);

    clock.fireNext();
    expect(recorder.lines).toEqual(['a']);
    clock.fireNext();
    clock.fireNext();
    expect(recorder.lines).toEqual(['a', 'b', 'c']);
    expect(recorder.ends).toEqual(['finished']);
    expect(driver.isRunning()).toBe(false);
    expect(clock.pendingCount()).toBe(0);
  });

  it('never runs two streams at once', () => {
    const clock = createFakeTimers();
    const first = createRecorder();
    const second = createRecorder();
    const driver = createStreamDriver(clock.timers, () => 200);
    driver.start(['a', 'b'], first.sink);
    expect(driver.start(['x', 'y'], second.sink)).toBe(false);
    expect(clock.pendingCount()).toBe(1);
    clock.fireNext();
    clock.fireNext();
    expect(second.lines).toEqual([]);
    expect(first.lines).toEqual(['a', 'b']);
  });

  it('stops: the timer is cleared, no more lines arrive and a new stream can start', () => {
    const clock = createFakeTimers();
    const recorder = createRecorder();
    const driver = createStreamDriver(clock.timers, () => 200);
    driver.start(['a', 'b', 'c'], recorder.sink);
    clock.fireNext();
    driver.stop();
    expect(clock.pendingCount()).toBe(0);
    expect(clock.fireNext()).toBeNull();
    expect(recorder.lines).toEqual(['a']);
    expect(recorder.ends).toEqual([]);
    expect(driver.start(['z'], createRecorder().sink)).toBe(true);
  });

  it('can be stopped twice and before it ever started', () => {
    const driver = createStreamDriver(createFakeTimers().timers, () => 200);
    driver.stop();
    driver.stop();
    expect(driver.isRunning()).toBe(false);
  });

  it('stops at the line cap and says it was the limit', () => {
    const clock = createFakeTimers();
    const recorder = createRecorder();
    const driver = createStreamDriver(clock.timers, () => 200, 3);
    driver.start(['1', '2', '3', '4', '5'], recorder.sink);
    while (clock.fireNext() !== null);
    expect(recorder.lines).toEqual(['1', '2', '3']);
    expect(recorder.ends).toEqual(['limit']);
  });

  it('calls a stream that fits the cap exactly finished, not limited', () => {
    const clock = createFakeTimers();
    const recorder = createRecorder();
    const driver = createStreamDriver(clock.timers, () => 200, 2);
    driver.start(['1', '2'], recorder.sink);
    while (clock.fireNext() !== null);
    expect(recorder.ends).toEqual(['finished']);
  });

  it('asks the clock for the delay it was given', () => {
    const clock = createFakeTimers();
    const delays = [150, 400];
    const driver = createStreamDriver(clock.timers, () => delays.shift() ?? 300);
    driver.start(['a', 'b'], createRecorder().sink);
    expect(clock.fireNext()).toBe(150);
  });

  it('survives a sink that stops the stream while receiving a line', () => {
    const clock = createFakeTimers();
    const driver = createStreamDriver(clock.timers, () => 200);
    const ends: string[] = [];
    driver.start(['a', 'b'], { onLine: () => driver.stop(), onEnd: (reason) => ends.push(reason) });
    clock.fireNext();
    expect(clock.pendingCount()).toBe(0);
    expect(ends).toEqual([]);
    expect(driver.isRunning()).toBe(false);
  });
});
