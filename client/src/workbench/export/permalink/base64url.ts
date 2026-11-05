import { PermalinkError } from './permalinkError';

const CHUNK = 0x8000;
const BASE64URL = /^[A-Za-z0-9_-]*$/;

/** Bytes as URL-safe base64 without padding. */
export function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let start = 0; start < bytes.length; start += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(start, start + CHUNK));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** The bytes of URL-safe base64; any other character, or an impossible length, is corrupt data. */
export function fromBase64Url(text: string): Uint8Array {
  if (!BASE64URL.test(text) || text.length % 4 === 1) {
    throw new PermalinkError('corrupt');
  }
  const padded = text
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(text.length / 4) * 4, '=');
  try {
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  } catch {
    throw new PermalinkError('corrupt');
  }
}
