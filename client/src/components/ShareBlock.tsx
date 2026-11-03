import { SHARE_TEXT } from '../content/share';
import { useShareLink } from '../hooks/useShareLink';
import { shareUrl } from '../lib/format';
import { ACTION_BUTTON_CLASS } from '../lib/styles';
import { CopyButton } from './CopyButton';
import { ReportSection } from './ReportSection';

interface ShareBlockProps {
  analysisId: string;
  initialToken: string | null;
}

/** Creates the secret read-only link of the report, shows it, and can switch it off. */
export function ShareBlock({ analysisId, initialToken }: ShareBlockProps) {
  const { shareToken, busy, error, create, stop } = useShareLink(analysisId, initialToken);

  return (
    <ReportSection title={SHARE_TEXT.title}>
      {shareToken ? (
        <ActiveLink url={shareUrl(shareToken)} busy={busy} onStop={stop} />
      ) : (
        <>
          <p className="mb-4 text-chalk">{SHARE_TEXT.description}</p>
          <button type="button" disabled={busy} onClick={create} className={ACTION_BUTTON_CLASS}>
            {SHARE_TEXT.create}
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="mt-3 border-l-4 border-marker pl-4 text-chalk">
          {error}
        </p>
      )}
    </ReportSection>
  );
}

function ActiveLink({ url, busy, onStop }: { url: string; busy: boolean; onStop: () => void }) {
  return (
    <>
      <label htmlFor="share-link" className="mb-2 block text-sm font-bold text-chalk">
        {SHARE_TEXT.linkLabel}
      </label>
      <input
        id="share-link"
        readOnly
        value={url}
        onFocus={(event) => event.currentTarget.select()}
        className="bands w-full border-2 border-ink px-3 py-2 font-mono text-[13.5px] text-ink"
      />
      <div className="mt-3 flex flex-wrap gap-3">
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
      <p className="mt-3 text-sm text-chalk">{SHARE_TEXT.stopHint}</p>
    </>
  );
}
