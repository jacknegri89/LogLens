import { useCallback, useState } from 'react';

import { useLanguage } from '../../i18n/useLanguage';
import { useWorkbench } from '../core/useWorkbench';
import { buildShareState } from './permalink/buildShareState';
import { encodePermalinkState } from './permalink/permalinkCodec';
import { PermalinkError, type PermalinkErrorCode } from './permalink/permalinkError';
import { buildPermalinkUrl } from './permalink/permalinkUrl';

export type ShareStatus =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'ready'; url: string; replaced: number; forLog: string }
  | { kind: 'failed'; code: PermalinkErrorCode };

function codeOf(failure: unknown): PermalinkErrorCode {
  return failure instanceof PermalinkError ? failure.code : 'unsupported';
}

/** Builds the share link of the loaded log; the log is anonymized before it goes into the link. */
export function usePermalinkShare() {
  const { rawLog, analysis } = useWorkbench();
  const { language } = useLanguage();
  const [status, setStatus] = useState<ShareStatus>({ kind: 'idle' });

  const create = useCallback(async () => {
    setStatus({ kind: 'working' });
    try {
      const { state, occurrences } = buildShareState(language, rawLog, analysis.record);
      const data = await encodePermalinkState(state);
      const url = buildPermalinkUrl(window.location.origin, data);
      setStatus({ kind: 'ready', url, replaced: occurrences, forLog: rawLog });
    } catch (failure) {
      setStatus({ kind: 'failed', code: codeOf(failure) });
    }
  }, [language, rawLog, analysis.record]);

  // A link built for another log would mislead, so it is hidden when the log changes.
  const visible =
    status.kind === 'ready' && status.forLog !== rawLog ? { kind: 'idle' as const } : status;
  return { status: visible, create };
}
