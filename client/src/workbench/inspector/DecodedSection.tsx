import { INSPECTOR_TEXT } from '../../content/workbenchInspect';
import { useText } from '../../i18n/useText';
import type { DecodedToken } from './decode/types';
import { TokenDetails } from './TokenDetails';
import { TOKEN_PANEL_ID, tokenPreview } from './tokenUi';

interface DecodedSectionProps {
  tokens: readonly DecodedToken[];
  activeId: string | null;
  onToggle: (tokenId: string) => void;
  nowMilliseconds: number;
}

interface TokenChipProps {
  token: DecodedToken;
  open: boolean;
  onToggle: (tokenId: string) => void;
}

function TokenChip({ token, open, onToggle }: TokenChipProps) {
  const text = useText(INSPECTOR_TEXT);
  return (
    <li>
      <button
        type="button"
        className="inspect-chip"
        aria-expanded={open}
        aria-controls={TOKEN_PANEL_ID}
        onClick={() => onToggle(token.id)}
      >
        <span className="inspect-chip-kind">{text.tokenKinds[token.kind]}</span>
        <span className="inspect-chip-value">{tokenPreview(token)}</span>
      </button>
    </li>
  );
}

/** Every decodable part of the line as a chip; the chosen one opens below with its content. */
export function DecodedSection(props: DecodedSectionProps) {
  const text = useText(INSPECTOR_TEXT);
  const active = props.tokens.find((token) => token.id === props.activeId);
  if (props.tokens.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="inspector-decoded-title">
      <h3 id="inspector-decoded-title" className="inspect-heading">
        {text.decodedTitle}
      </h3>
      <ul className="inspect-chips">
        {props.tokens.map((token) => (
          <TokenChip
            key={token.id}
            token={token}
            open={token === active}
            onToggle={props.onToggle}
          />
        ))}
      </ul>
      {active && (
        <div
          id={TOKEN_PANEL_ID}
          role="region"
          aria-label={text.tokenPanel}
          className="inspect-panel"
        >
          <TokenDetails details={active.details} now={props.nowMilliseconds} />
        </div>
      )}
    </section>
  );
}
