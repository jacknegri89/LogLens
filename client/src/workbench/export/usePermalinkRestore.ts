import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { useLanguage } from '../../i18n/useLanguage';
import { useWorkbench } from '../core/useWorkbench';
import { decodePermalinkState } from './permalink/permalinkCodec';
import { PermalinkError, type PermalinkErrorCode } from './permalink/permalinkError';
import { readPermalinkData } from './permalink/permalinkUrl';
import { recordFromState } from './permalink/recordFromState';

export type RestoreOutcome =
  | { kind: 'idle' }
  | { kind: 'restored'; withReport: boolean }
  | { kind: 'failed'; code: PermalinkErrorCode };

// One page load restores a given link once, even if the Workbench mounts again.
let handledData: string | null = null;

function codeOf(failure: unknown): PermalinkErrorCode {
  return failure instanceof PermalinkError ? failure.code : 'unsupported';
}

/** Opens `/workbench#s=...`: loads the shared log and report, or says why it cannot. */
export function usePermalinkRestore() {
  const { hash } = useLocation();
  const { setLog, loadAnalysis } = useWorkbench();
  const { setLanguage } = useLanguage();
  const [outcome, setOutcome] = useState<RestoreOutcome>({ kind: 'idle' });

  useEffect(() => {
    const data = readPermalinkData(hash);
    if (data === null || data === handledData) return;
    handledData = data;
    decodePermalinkState(data).then(
      (state) => {
        const record = recordFromState(state, new Date());
        setLog(state.log);
        setLanguage(state.language);
        loadAnalysis(record);
        setOutcome({ kind: 'restored', withReport: record !== null });
      },
      (failure: unknown) => setOutcome({ kind: 'failed', code: codeOf(failure) }),
    );
  }, [hash, setLog, setLanguage, loadAnalysis]);

  return { outcome, dismiss: () => setOutcome({ kind: 'idle' }) };
}
