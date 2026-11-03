import { useEffect, useState } from 'react';

/**
 * Steps through the stages of a wait, one every `intervalMs`, and stays on the last
 * one: the server gives no real progress, so going back to the start would mislead.
 */
export function useStageProgress(stageCount: number, intervalMs: number): number {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStage((current) => Math.min(current + 1, stageCount - 1));
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [stageCount, intervalMs]);

  return stage;
}
