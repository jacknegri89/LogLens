import type { DecodedToken } from './decode/types';

/** The id that ties every token button to the panel it opens. */
export const TOKEN_PANEL_ID = 'inspector-token-panel';

const PREVIEW_LENGTH = 26;

/** Short text for a token: the start of what was written in the line. */
export function tokenPreview(token: DecodedToken): string {
  return token.source.length > PREVIEW_LENGTH + 2
    ? `${token.source.slice(0, PREVIEW_LENGTH)}…`
    : token.source;
}
