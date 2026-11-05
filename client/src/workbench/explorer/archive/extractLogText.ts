import { ArchiveError, DEFAULT_LIMITS, type ArchiveLimits } from './archiveError';
import { gunzip, isGzip } from './inflate';
import { isTar, readTar } from './tar';
import { decodeText, joinEntries, looksBinary } from './text';
import { isZip, readZip } from './zip';

export type InputFormat = 'text' | 'gzip' | 'zip' | 'tar' | 'unsupported';

/** The accepted file types, for the file picker. */
export const ACCEPTED_FILES = '.log,.txt,.gz,.zip,.tar,.tgz,.tar.gz,text/plain';

const UNSUPPORTED_NAMES = /\.(?:7z|rar|bz2|xz|zst|lz4|exe|dll|so|png|jpe?g|gif|webp|pdf)$/i;

function formatFromBytes(bytes: Uint8Array): InputFormat | null {
  if (isGzip(bytes)) {
    return 'gzip';
  }
  if (isZip(bytes)) {
    return 'zip';
  }
  if (isTar(bytes)) {
    return 'tar';
  }
  return null;
}

function formatFromName(name: string): InputFormat | null {
  if (/\.(?:tgz|gz)$/i.test(name)) {
    return 'gzip';
  }
  if (/\.zip$/i.test(name)) {
    return 'zip';
  }
  if (/\.tar$/i.test(name)) {
    return 'tar';
  }
  if (UNSUPPORTED_NAMES.test(name)) {
    return 'unsupported';
  }
  return null;
}

/** The content decides first; the name only matters when the bytes say nothing. */
export function detectFormat(name: string, bytes: Uint8Array): InputFormat {
  const format = formatFromBytes(bytes) ?? formatFromName(name);
  if (format) {
    return format;
  }
  if (looksBinary(bytes)) {
    return 'unsupported';
  }
  return 'text';
}

/** A .gz holds either one log or a whole TAR (.tar.gz, .tgz). */
function textOfGunzipped(bytes: Uint8Array, limits: ArchiveLimits): string {
  if (isTar(bytes)) {
    return joinEntries(readTar(bytes, limits));
  }
  if (looksBinary(bytes)) {
    throw new ArchiveError('unsupported');
  }
  return decodeText(bytes);
}

/**
 * The log text of a file: plain text, .gz, .zip, .tar, .tar.gz or .tgz, all decoded here in
 * the browser. Throws an ArchiveError the page can explain.
 */
export async function extractLogText(
  name: string,
  bytes: Uint8Array,
  limits: ArchiveLimits = DEFAULT_LIMITS,
): Promise<string> {
  if (bytes.length > limits.maxTotalBytes) {
    throw new ArchiveError('tooBig');
  }
  const format = detectFormat(name, bytes);
  if (format === 'gzip') {
    return textOfGunzipped(await gunzip(bytes, limits.maxTotalBytes), limits);
  }
  if (format === 'zip') {
    return joinEntries(await readZip(bytes, limits));
  }
  if (format === 'tar') {
    return joinEntries(readTar(bytes, limits));
  }
  if (format === 'unsupported') {
    throw new ArchiveError('unsupported');
  }
  return decodeText(bytes);
}
