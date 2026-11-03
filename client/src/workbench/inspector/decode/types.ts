export type DecodedKind = 'jwt' | 'base64' | 'urlencoded' | 'epoch';

export interface JwtTimeClaim {
  name: 'exp' | 'iat' | 'nbf';
  epochMilliseconds: number;
}

/** A JWT is only read, never verified: nothing here says the token is genuine. */
export interface JwtDetails {
  kind: 'jwt';
  algorithm: string;
  headerJson: string;
  payloadJson: string | null;
  claims: JwtTimeClaim[];
  /** The `exp` claim in epoch milliseconds, or null when the token has none. */
  expiresAtMilliseconds: number | null;
}

export interface Base64Details {
  kind: 'base64';
  text: string;
  /** Pretty-printed JSON when the decoded text is JSON, otherwise null. */
  json: string | null;
}

export interface UrlEncodedDetails {
  kind: 'urlencoded';
  text: string;
  /** Decoded key and value pairs when the value is a query string, otherwise empty. */
  pairs: Array<[key: string, value: string]>;
}

export interface EpochDetails {
  kind: 'epoch';
  unit: 'seconds' | 'milliseconds';
  epochMilliseconds: number;
}

export type DecodedDetails = JwtDetails | Base64Details | UrlEncodedDetails | EpochDetails;

/** Something readable found in a line. `start` is -1 when it came from a field value, not the raw text. */
export interface DecodedToken {
  id: string;
  kind: DecodedKind;
  start: number;
  end: number;
  source: string;
  details: DecodedDetails;
}
