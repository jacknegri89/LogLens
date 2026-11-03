import { decodeBase64Text } from './base64';
import type { DecodedToken, JwtDetails, JwtTimeClaim } from './types';

const JWT_SHAPE = /(?<![\w.-])[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{2,}\.[A-Za-z0-9_-]*(?![\w-])/g;
const TIME_CLAIMS = ['exp', 'iat', 'nbf'] as const;
const MAX_SECONDS = 4_102_444_800; // year 2100

function readJsonObject(encoded: string): Record<string, unknown> | null {
  const text = decodeBase64Text(encoded, true);
  if (text === null) return null;
  try {
    const value: unknown = JSON.parse(text);
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function readTimeClaims(payload: Record<string, unknown> | null): JwtTimeClaim[] {
  if (!payload) return [];
  const claims: JwtTimeClaim[] = [];
  for (const name of TIME_CLAIMS) {
    const seconds = payload[name];
    if (typeof seconds === 'number' && seconds >= 0 && seconds <= MAX_SECONDS) {
      claims.push({ name, epochMilliseconds: Math.round(seconds * 1000) });
    }
  }
  return claims;
}

/** Reads the three parts of a JWT. Returns null when the first part is not a JSON header with `alg`. */
export function decodeJwt(candidate: string): JwtDetails | null {
  const [headerPart, payloadPart] = candidate.split('.');
  const header = readJsonObject(headerPart);
  if (!header || typeof header.alg !== 'string') return null;
  const payload = readJsonObject(payloadPart);
  const claims = readTimeClaims(payload);
  return {
    kind: 'jwt',
    algorithm: header.alg,
    headerJson: JSON.stringify(header, null, 2),
    payloadJson: payload ? JSON.stringify(payload, null, 2) : null,
    claims,
    expiresAtMilliseconds: claims.find((claim) => claim.name === 'exp')?.epochMilliseconds ?? null,
  };
}

/** Whether a token with this `exp` is past its expiry at `nowMilliseconds`. Says nothing about validity. */
export function isExpired(expiresAtMilliseconds: number, nowMilliseconds: number): boolean {
  return expiresAtMilliseconds <= nowMilliseconds;
}

export function findJwts(text: string): DecodedToken[] {
  const found: DecodedToken[] = [];
  for (const match of text.matchAll(JWT_SHAPE)) {
    const details = decodeJwt(match[0]);
    if (!details) continue;
    const start = match.index;
    found.push({
      id: `jwt-${start}`,
      kind: 'jwt',
      start,
      end: start + match[0].length,
      source: match[0],
      details,
    });
  }
  return found;
}
