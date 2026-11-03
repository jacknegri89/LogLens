import { useEffect, useState } from 'react';

import { useWorkbench } from '../../core/useWorkbench';
import { createScenario, SCENARIO_KINDS, type ScenarioKind } from './scenarios';
import { createStreamDriver, type StreamDriver } from './streamDriver';
import { useFatalIntercept } from './useFatalIntercept';

export interface TailState {
  /** The scenario being streamed, or null when no stream is running. */
  scenario: ScenarioKind | null;
  appended: number;
  /** The last line of the stream, which is the one that must show up as FATAL in the log. */
  expectedFatalLine: string | null;
  limitReached: boolean;
}

type SetTail = (update: (current: TailState) => TailState) => void;

const IDLE: TailState = {
  scenario: null,
  appended: 0,
  expectedFatalLine: null,
  limitReached: false,
};

function startScenario(driver: StreamDriver, appendLog: (text: string) => void, setTail: SetTail) {
  const now = Date.now();
  const scenario = SCENARIO_KINDS[now % SCENARIO_KINDS.length];
  const script = createScenario({ kind: scenario, seed: now, startTimeMs: now });
  const started = driver.start(script, {
    onLine: (line, appended) => {
      appendLog(line);
      setTail((current) => ({ ...current, appended }));
    },
    onEnd: (reason) =>
      setTail((current) => ({ ...current, scenario: null, limitReached: reason === 'limit' })),
  });
  return started ? { ...IDLE, scenario, expectedFatalLine: script[script.length - 1] } : null;
}

/** The live tail: a simulated stream added to the loaded log, one line at a time. */
export function useLiveTail() {
  const { appendLog } = useWorkbench();
  const [driver] = useState(() => createStreamDriver());
  const [tail, setTail] = useState<TailState>(IDLE);
  const fatalLine = useFatalIntercept(tail.expectedFatalLine);

  useEffect(() => () => driver.stop(), [driver]);

  function start() {
    const started = startScenario(driver, appendLog, setTail);
    if (started) setTail(() => started);
  }

  function stop() {
    driver.stop();
    setTail((current) => ({ ...current, scenario: null, expectedFatalLine: null }));
  }

  function dismiss() {
    setTail((current) => ({ ...current, expectedFatalLine: null, limitReached: false }));
  }

  return { tail, fatalLine, start, stop, dismiss };
}
