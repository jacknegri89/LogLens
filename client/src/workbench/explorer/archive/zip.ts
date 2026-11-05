import { ArchiveError, type ArchiveEntry, type ArchiveLimits } from './archiveError';
import { inflate } from './inflate';
import { decodeText, looksBinary } from './text';

const END_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const END_RECORD_SIZE = 22;
const MAX_COMMENT_SIZE = 0xffff;
const ZIP64_MARKER = 0xffffffff;
const STORED = 0;
const DEFLATED = 8;

interface ZipEntryInfo {
  name: string;
  method: number;
  encrypted: boolean;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
}

export function isZip(bytes: Uint8Array): boolean {
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    return false;
  }
  return (bytes[2] === 3 && bytes[3] === 4) || (bytes[2] === 5 && bytes[3] === 6);
}

/** The end-of-central-directory record sits in the last 22 bytes plus an optional comment. */
function findEndRecord(view: DataView): number {
  const last = view.byteLength - END_RECORD_SIZE;
  const first = Math.max(0, last - MAX_COMMENT_SIZE);
  for (let offset = last; offset >= first; offset -= 1) {
    if (view.getUint32(offset, true) === END_SIGNATURE) {
      return offset;
    }
  }
  throw new ArchiveError('corrupt');
}

function readCentralRecord(view: DataView, offset: number) {
  if (view.getUint32(offset, true) !== CENTRAL_SIGNATURE) {
    throw new ArchiveError('corrupt');
  }
  const nameLength = view.getUint16(offset + 28, true);
  const nameStart = offset + 46;
  const nameBytes = new Uint8Array(view.buffer, view.byteOffset + nameStart, nameLength);
  const info: ZipEntryInfo = {
    name: decodeText(nameBytes),
    method: view.getUint16(offset + 10, true),
    encrypted: (view.getUint16(offset + 8, true) & 1) === 1,
    compressedSize: view.getUint32(offset + 20, true),
    uncompressedSize: view.getUint32(offset + 24, true),
    localOffset: view.getUint32(offset + 42, true),
  };
  const extraLength = view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
  return { info, next: nameStart + nameLength + extraLength };
}

function readDirectory(view: DataView, limits: ArchiveLimits): ZipEntryInfo[] {
  const end = findEndRecord(view);
  const count = view.getUint16(end + 10, true);
  if (count > limits.maxEntries) {
    throw new ArchiveError('tooManyEntries');
  }
  const entries: ZipEntryInfo[] = [];
  let offset = view.getUint32(end + 16, true);
  for (let position = 0; position < count; position += 1) {
    const record = readCentralRecord(view, offset);
    entries.push(record.info);
    offset = record.next;
  }
  return entries;
}

function isReadableFile(info: ZipEntryInfo): boolean {
  return !info.name.endsWith('/') && !info.encrypted && !info.name.startsWith('__MACOSX/');
}

/** Declared sizes can lie, so this only refuses early; inflating checks the real output too. */
function checkDeclaredSizes(files: ZipEntryInfo[], limits: ArchiveLimits): void {
  if (files.some((info) => info.uncompressedSize === ZIP64_MARKER)) {
    throw new ArchiveError('unsupported');
  }
  const declared = files.reduce((sum, info) => sum + info.uncompressedSize, 0);
  if (declared > limits.maxTotalBytes) {
    throw new ArchiveError('tooBig');
  }
}

function compressedData(view: DataView, bytes: Uint8Array, info: ZipEntryInfo): Uint8Array {
  const at = info.localOffset;
  if (view.getUint32(at, true) !== LOCAL_SIGNATURE) {
    throw new ArchiveError('corrupt');
  }
  const start = at + 30 + view.getUint16(at + 26, true) + view.getUint16(at + 28, true);
  const end = start + info.compressedSize;
  if (end > bytes.length) {
    throw new ArchiveError('corrupt');
  }
  return bytes.subarray(start, end);
}

async function extract(info: ZipEntryInfo, data: Uint8Array, budget: number) {
  if (info.method === DEFLATED) {
    return inflate(data, 'deflate-raw', budget);
  }
  if (info.method !== STORED) {
    return null;
  }
  if (data.byteLength > budget) {
    throw new ArchiveError('tooBig');
  }
  return data;
}

async function readEntries(bytes: Uint8Array, limits: ArchiveLimits): Promise<ArchiveEntry[]> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const files = readDirectory(view, limits).filter(isReadableFile);
  checkDeclaredSizes(files, limits);
  const entries: ArchiveEntry[] = [];
  let used = 0;
  for (const info of files) {
    const content = await extract(
      info,
      compressedData(view, bytes, info),
      limits.maxTotalBytes - used,
    );
    if (!content) {
      continue;
    }
    used += content.byteLength;
    if (!looksBinary(content)) {
      entries.push({ name: info.name, text: decodeText(content) });
    }
  }
  return entries;
}

/** The text files of a ZIP archive (stored or deflated); folders and binary files are skipped. */
export async function readZip(bytes: Uint8Array, limits: ArchiveLimits): Promise<ArchiveEntry[]> {
  try {
    return await readEntries(bytes, limits);
  } catch (error) {
    // A DataView read past the end means the archive lies about its own layout.
    if (error instanceof ArchiveError) {
      throw error;
    }
    throw new ArchiveError('corrupt');
  }
}
