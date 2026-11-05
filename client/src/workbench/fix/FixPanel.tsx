import { FIX_TEXT } from '../../content/workbenchFix';
import { useText } from '../../i18n/useText';

export function FixPanel() {
  const text = useText(FIX_TEXT);
  return <p role="status">{text.unavailable}</p>;
}
