/** Helpers that build encoded samples for the decoder tests; they are not part of the app. */
export function toBase64Url(text: string): string {
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function makeJwt(header: object, payload: object, signature = 'c2lnbmF0dXJl'): string {
  return `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(payload))}.${signature}`;
}
