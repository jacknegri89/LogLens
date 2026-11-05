import { useCallback, useRef, useState } from 'react';

import { useWorkbench } from '../../core/useWorkbench';
import { ArchiveError, DEFAULT_LIMITS, type ArchiveErrorKind } from '../archive/archiveError';
import { extractLogText } from '../archive/extractLogText';

export type LoadErrorKind = ArchiveErrorKind | 'readFailed';

interface LoaderState {
  reading: boolean;
  error: LoadErrorKind | null;
}

const IDLE: LoaderState = { reading: false, error: null };

async function readLogFile(file: File): Promise<string> {
  if (file.size > DEFAULT_LIMITS.maxTotalBytes) {
    throw new ArchiveError('tooBig');
  }
  return extractLogText(file.name, new Uint8Array(await file.arrayBuffer()));
}

type ReadOutcome = { text: string } | { error: LoadErrorKind };

function readOutcome(file: File): Promise<ReadOutcome> {
  return readLogFile(file).then(
    (text) => ({ text }),
    (error: unknown) => {
      if (error instanceof ArchiveError) {
        return { error: error.kind };
      }
      return { error: 'readFailed' };
    },
  );
}

/** Reads a dropped or picked file (plain or compressed) into the Workbench, in the browser. */
export function useLogFileLoader() {
  const { setLog } = useWorkbench();
  const [state, setState] = useState<LoaderState>(IDLE);
  // Only the last file counts: a slow archive must not replace one picked after it.
  const latestJob = useRef(0);

  const loadFile = useCallback(
    async (file: File) => {
      const job = (latestJob.current += 1);
      setState({ reading: true, error: null });
      const outcome = await readOutcome(file);
      if (job !== latestJob.current) {
        return;
      }
      if ('text' in outcome) {
        setLog(outcome.text, file.name);
      }
      if ('error' in outcome) {
        setState({ reading: false, error: outcome.error });
      } else {
        setState(IDLE);
      }
    },
    [setLog],
  );
  const reset = useCallback(() => {
    latestJob.current += 1;
    setState(IDLE);
  }, []);

  return { ...state, loadFile, reset };
}

export type LogFileLoader = ReturnType<typeof useLogFileLoader>;
