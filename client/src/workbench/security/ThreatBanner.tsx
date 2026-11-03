import { SECURITY_TEXT } from '../../content/workbenchSecurity';
import { useText } from '../../i18n/useText';
import type { ScanResult } from './scan/types';

/** The red stamp shown when any high-severity attack signal exists. */
export function ThreatBanner({ result }: { result: ScanResult }) {
  const text = useText(SECURITY_TEXT).panel;
  if (result.highSignals === 0) return null;

  return (
    <div role="alert" className="sec-banner evidence-sheet">
      <span className="stamp stamp-pen sec-banner-stamp">{text.alertStamp}</span>
      <div className="min-w-0">
        <p className="sec-banner-title">
          {text.alert(result.highSignals, result.highAddresses.length)}
        </p>
        <p className="sec-banner-hint">{text.alertHint}</p>
      </div>
    </div>
  );
}
