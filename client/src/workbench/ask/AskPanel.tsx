import { ASK_TEXT } from '../../content/workbenchAsk';
import { useText } from '../../i18n/useText';

export function AskPanel() {
  const text = useText(ASK_TEXT);
  return <p role="status">{text.unavailable}</p>;
}
