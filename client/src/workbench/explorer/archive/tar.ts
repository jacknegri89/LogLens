import { ArchiveError, type ArchiveEntry, type ArchiveLimits } from './archiveError';
import { decodeText, looksBinary } from './text';

const BLOCK = 512;
const REGULAR_FILE_TYPES = new Set(['0', '\0', '7']);
const GNU_LONG_NAME = 'L';

interface TarHeader {
  name: string;
  size: number;
  type: string;
}

export function isTar(bytes: Uint8Array): boolean {
  return bytes.length >= BLOCK && readField(bytes, 257, 5) === 'ustar';
}

/** A NUL-terminated text field of a header. */
function readField(bytes: Uint8Array, start: number, length: number): string {
  const field = bytes.subarray(start, start + length);
  const end = field.indexOf(0);
  return decodeText(end === -1 ? field : field.subarray(0, end));
}

function parseOctal(text: string): number {
  const digits = text.trim();
  if (digits === '') return 0;
  if (!/^[0-7]+$/.test(digits)) throw new ArchiveError('corrupt');
  return Number.parseInt(digits, 8);
}

/** The checksum adds every header byte, counting its own 8 bytes as spaces. */
function checksumMatches(header: Uint8Array): boolean {
  let sum = 0;
  for (let position = 0; position < BLOCK; position += 1) {
    sum += position >= 148 && position < 156 ? 32 : header[position];
  }
  return sum === parseOctal(readField(header, 148, 8));
}

function readHeader(header: Uint8Array): TarHeader {
  if (!checksumMatches(header)) throw new ArchiveError('corrupt');
  const name = readField(header, 0, 100);
  const prefix = isTar(header) ? readField(header, 345, 155) : '';
  return {
    name: prefix ? `${prefix}/${name}` : name,
    size: parseOctal(readField(header, 124, 12)),
    type: String.fromCharCode(header[156]),
  };
}

function isZeroBlock(block: Uint8Array): boolean {
  return block.every((byte) => byte === 0);
}

interface TarWalk {
  entries: ArchiveEntry[];
  /** A GNU long name applies to the header that follows it. */
  longName: string | null;
}

function visit(walk: TarWalk, header: TarHeader, data: Uint8Array): void {
  if (header.type === GNU_LONG_NAME) {
    walk.longName = readField(data, 0, data.length);
    return;
  }
  const name = walk.longName ?? header.name;
  walk.longName = null;
  if (!REGULAR_FILE_TYPES.has(header.type) || name.endsWith('/') || looksBinary(data)) return;
  walk.entries.push({ name, text: decodeText(data) });
}

/** The text files of a TAR archive (ustar headers); folders, links and binary files are skipped. */
export function readTar(bytes: Uint8Array, limits: ArchiveLimits): ArchiveEntry[] {
  const walk: TarWalk = { entries: [], longName: null };
  let offset = 0;
  for (let count = 1; offset + BLOCK <= bytes.length; count += 1) {
    const block = bytes.subarray(offset, offset + BLOCK);
    if (isZeroBlock(block)) break;
    if (count > limits.maxEntries) throw new ArchiveError('tooManyEntries');
    const header = readHeader(block);
    const dataStart = offset + BLOCK;
    if (dataStart + header.size > bytes.length) throw new ArchiveError('corrupt');
    visit(walk, header, bytes.subarray(dataStart, dataStart + header.size));
    offset = dataStart + Math.ceil(header.size / BLOCK) * BLOCK;
  }
  return walk.entries;
}
