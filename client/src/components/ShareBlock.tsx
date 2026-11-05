import { SHARE_TEXT } from '../content/share';
import { useText } from '../i18n/useText';
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
  const text = useText(SHARE_TEXT);
  const { shareToken, busy, error, create, stop } = useShareLink(analysisId, initialToken);
  let shareContent;
  if (shareToken) {
    shareContent = <ActiveLink url={shareUrl(shareToken)} busy={busy} onStop={stop} />;
  } else {
    shareContent = (
      <>
        <p className="report-drawer-hint">{text.description}</p>
        <button type="button" disabled={busy} onClick={create} className={ACTION_BUTTON_CLASS}>
          {text.create}
        </button>
      </>
    );
  }

  return (
    <ToolDrawer title={text.title} className="report-drawer-share">
      <p role="note" className="report-drawer-warning">
        {text.warning}
      </p>
      {shareContent}
      {error && (
        <p role="alert" className="report-drawer-error">
          {error}
        </p>
      )}
    </ToolDrawer>
  );
}

function ActiveLink({ url, busy, onStop }: { url: string; busy: boolean; onStop: () => void }) {
  const text = useText(SHARE_TEXT);
  return (
    <>
      <label htmlFor="share-link" className="report-drawer-field-label">
        {text.linkLabel}
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
          label={text.copy}
          copiedLabel={text.copied}
          className={ACTION_BUTTON_CLASS}
        />
        <button type="button" disabled={busy} onClick={onStop} className={ACTION_BUTTON_CLASS}>
          {text.stop}
        </button>
      </div>
      <p className="report-drawer-hint">{text.stopHint}</p>
    </>
  );
}
