export type ArchiveErrorKind = 'corrupt' | 'tooBig' | 'tooManyEntries' | 'unsupported' | 'noText';

/** A file that cannot become log text; `kind` picks the message the visitor reads. */
export class ArchiveError extends Error {
  readonly kind: ArchiveErrorKind;

  constructor(kind: ArchiveErrorKind) {
    super(`Cannot read the file: ${kind}`);
    this.name = 'ArchiveError';
    this.kind = kind;
  }
}

/** Guards against zip bombs and runaway files: everything is decoded in the visitor's tab. */
export interface ArchiveLimits {
  maxTotalBytes: number;
  maxEntries: number;
}

export const DEFAULT_LIMITS: ArchiveLimits = { maxTotalBytes: 50 * 1024 * 1024, maxEntries: 500 };

/** One text file found inside an archive. */
export interface ArchiveEntry {
  name: string;
  text: string;
}
