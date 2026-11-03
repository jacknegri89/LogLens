import '../../styles/workbench-export.css';

import { EXPORT_TEXT } from '../../content/workbenchExport';
import { useText } from '../../i18n/useText';
import { usePermalinkRestore } from './usePermalinkRestore';

/** Restores a log shared by link and tells the visitor so; a bad link gets an alert and changes nothing. */
export function PermalinkRestoreNotice() {
  const text = useText(EXPORT_TEXT);
  const { outcome, dismiss } = usePermalinkRestore();
  if (outcome.kind === 'idle') return null;

  const failed = outcome.kind === 'failed';
  const message = failed
    ? text.share.errors[outcome.code]
    : outcome.withReport
      ? text.restored.withReport
      : text.restored.logOnly;

  return (
    <div role={failed ? 'alert' : 'status'} className="exp-notice mt-4" data-failed={failed}>
      <p>{message}</p>
      <button type="button" onClick={dismiss} className="exp-notice-close">
        {text.restored.dismiss}
      </button>
    </div>
  );
}
