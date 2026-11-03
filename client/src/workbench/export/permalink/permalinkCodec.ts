import { fromBase64Url, toBase64Url } from './base64url';
import { deflate, inflate } from './compression';
import { PermalinkError } from './permalinkError';
import { validatePermalinkState, type PermalinkState } from './permalinkState';

/** Above this many characters a link is likely to be cut off by chat apps and servers. */
export const WARN_LINK_LENGTH = 8_000;
/** Above this many characters no link is made. */
export const REFUSE_LINK_LENGTH = 1_500_000;
/** The biggest state that is even tried; a bigger one cannot fit in a link once compressed. */
const MAX_JSON_BYTES = 32_000_000;

/** The state as the text that goes after `#s=`: JSON, raw deflate, base64url. */
export async function encodePermalinkState(state: PermalinkState): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(state));
  if (json.length > MAX_JSON_BYTES) throw new PermalinkError('too-large');
  const data = toBase64Url(await deflate(json));
  if (data.length > REFUSE_LINK_LENGTH) throw new PermalinkError('too-large');
  return data;
}

function parseJson(bytes: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new PermalinkError('corrupt');
  }
}

/** The state inside link data. Throws a PermalinkError and never returns something half-valid. */
export async function decodePermalinkState(data: string): Promise<PermalinkState> {
  if (data.length > REFUSE_LINK_LENGTH) throw new PermalinkError('too-large');
  const bytes = await inflate(fromBase64Url(data), MAX_JSON_BYTES);
  return validatePermalinkState(parseJson(bytes));
}
