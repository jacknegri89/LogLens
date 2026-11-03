export type PermalinkErrorCode = 'too-large' | 'corrupt' | 'invalid' | 'unsupported';

/** A share link that cannot be built or opened; `code` says why, so the page can word it. */
export class PermalinkError extends Error {
  readonly code: PermalinkErrorCode;

  constructor(code: PermalinkErrorCode) {
    super(`Permalink ${code}`);
    this.name = 'PermalinkError';
    this.code = code;
  }
}
