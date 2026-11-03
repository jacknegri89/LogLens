import { SHARE_TEXT } from '../content/share';
import { useShareLink } from '../hooks/useShareLink';
import { shareUrl } from '../lib/format';
import { ACTION_BUTTON_CLASS } from '../lib/styles';
import { CopyButton } from './CopyButton';
import { ToolDrawer } from './ToolDrawer';

interface ShareBlockProps {
  analysisId: string;
  initialToken: string | null;
}

/** Creates the secret read-only link of the report, shows it, and can switch it off. */
export function ShareBlock({ analysisId, initialToken }: ShareBlockProps) {
  const { shareToken, busy, error, create, stop } = useShareLink(analysisId, initialToken);

  return (
    <ToolDrawer title={SHARE_TEXT.title} className="report-drawer-share">
      <p role="note" className="report-drawer-warning">
        {SHARE_TEXT.warning}
      </p>
      {shareToken ? (
        <ActiveLink url={shareUrl(shareToken)} busy={busy} onStop={stop} />
      ) : (
        <>
          <p className="report-drawer-hint">{SHARE_TEXT.description}</p>
          <button type="button" disabled={busy} onClick={create} className={ACTION_BUTTON_CLASS}>
            {SHARE_TEXT.create}
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="report-drawer-error">
          {error}
        </p>
      )}
    </ToolDrawer>
  );
}

function ActiveLink({ url, busy, onStop }: { url: string; busy: boolean; onStop: () => void }) {
  return (
    <>
      <label htmlFor="share-link" className="report-drawer-field-label">
        {SHARE_TEXT.linkLabel}
      </label>
      <input
        id="share-link"
        readOnly
        value={url}
        onFocus={(event) => event.currentTarget.select()}
        className="report-drawer-field bands"
      />
      <div className="report-drawer-actions">
        <CopyButton
          text={url}
          label={SHARE_TEXT.copy}
          copiedLabel={SHARE_TEXT.copied}
          className={ACTION_BUTTON_CLASS}
        />
        <button type="button" disabled={busy} onClick={onStop} className={ACTION_BUTTON_CLASS}>
          {SHARE_TEXT.stop}
        </button>
      </div>
      <p className="report-drawer-hint">{SHARE_TEXT.stopHint}</p>
    </>
  );
}
