import { useId } from 'react';

import { CopyButton } from '../../components/CopyButton';
import { EXPORT_TEXT } from '../../content/workbenchExport';
import { useText } from '../../i18n/useText';
import { useWorkbench } from '../core/useWorkbench';
import { WARN_LINK_LENGTH } from './permalink/permalinkCodec';
import { usePermalinkShare } from './usePermalinkShare';

/** Builds a link that carries the sanitized log and the report in its address. */
export function ShareLinkCard() {
  const { rawLog } = useWorkbench();
  const text = useText(EXPORT_TEXT).share;
  const { status, create } = usePermalinkShare();
  const working = status.kind === 'working';
  let buttonText = text.create;
  if (working) {
    buttonText = text.creating;
  }

  return (
    <section aria-labelledby="share-title" className="exp-share">
      <h3 id="share-title" className="exp-subtitle">
        {text.title}
      </h3>
      <p className="exp-note">{text.intro}</p>
      <button
        type="button"
        onClick={create}
        disabled={rawLog.trim() === '' || working}
        className="btn-paper exp-create"
      >
        {buttonText}
      </button>
      {status.kind === 'failed' && (
        <p role="alert" className="exp-error">
          {text.errors[status.code]}
        </p>
      )}
      {status.kind === 'ready' && <ReadyLink url={status.url} replaced={status.replaced} />}
    </section>
  );
}

function ReadyLink({ url, replaced }: { url: string; replaced: number }) {
  const text = useText(EXPORT_TEXT).share;
  const fieldId = useId();

  return (
    <div className="exp-link">
      <p className="exp-note">{text.notice(replaced)}</p>
      <label htmlFor={fieldId} className="exp-link-label">
        {text.linkLabel}
      </label>
      <div className="exp-link-row">
        <input id={fieldId} readOnly value={url} onFocus={(event) => event.target.select()} />
        <CopyButton
          text={url}
          label={text.copyLink}
          copiedLabel={text.copiedLink}
          className="exp-button"
        />
      </div>
      <p className="exp-note">{text.length(url.length)}</p>
      {url.length > WARN_LINK_LENGTH && (
        <p role="status" className="exp-warning">
          {text.longWarning}
        </p>
      )}
    </div>
  );
}
