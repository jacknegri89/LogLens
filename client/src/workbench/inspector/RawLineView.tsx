import { INSPECTOR_TEXT } from '../../content/workbenchInspect';
import { useText } from '../../i18n/useText';
import { splitSegments } from './decode/findTokens';
import type { DecodedToken } from './decode/types';
import { TOKEN_PANEL_ID } from './tokenUi';

interface RawLineViewProps {
  raw: string;
  tokens: readonly DecodedToken[];
  activeId: string | null;
  onToggle: (tokenId: string) => void;
}

/** The raw line cut into text and decodable parts. Every part is a text node, never HTML. */
export function RawLineView({ raw, tokens, activeId, onToggle }: RawLineViewProps) {
  const text = useText(INSPECTOR_TEXT);
  return (
    <pre className="inspect-raw evidence-sheet">
      {splitSegments(raw, tokens).map(({ text: piece, token }, position) =>
        token ? (
          <button
            key={token.id}
            type="button"
            className="inspect-token"
            title={text.tokenKinds[token.kind]}
            aria-expanded={token.id === activeId}
            aria-controls={TOKEN_PANEL_ID}
            onClick={() => onToggle(token.id)}
          >
            {piece}
          </button>
        ) : (
          <span key={position}>{piece}</span>
        ),
      )}
    </pre>
  );
}
