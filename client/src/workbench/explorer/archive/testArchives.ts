// Builders of tiny archives for the tests only: real byte layouts, written by hand.

import { streamOf } from './inflate';

const encoder = new TextEncoder();

export function bytesOf(text: string): Uint8Array {
  return encoder.encode(text);
}

export async function compress(
  bytes: Uint8Array,
  format: 'gzip' | 'deflate-raw',
): Promise<Uint8Array> {
  const stream = streamOf(bytes).pipeThrough(new CompressionStream(format));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function writeText(target: Uint8Array, offset: number, text: string): void {
  target.set(bytesOf(text), offset);
}

function octal(value: number, digits: number): string {
  return `${value.toString(8).padStart(digits, '0')}\0`;
}

function tarHeader(name: string, size: number, type: string): Uint8Array {
  const header = new Uint8Array(512);
  writeText(header, 0, name);
  writeText(header, 100, '0000644\0');
  writeText(header, 124, octal(size, 11));
  writeText(header, 136, octal(0, 11));
  writeText(header, 148, '        ');
  writeText(header, 156, type);
  writeText(header, 257, 'ustar\u000000');
  const sum = header.reduce((total, byte) => total + byte, 0);
  writeText(header, 148, `${sum.toString(8).padStart(6, '0')}\0 `);
  return header;
}

export interface TarFile {
  name: string;
  content: Uint8Array;
  type?: string;
}

export function buildTar(files: TarFile[]): Uint8Array {
  const blocks: Uint8Array[] = [];
  for (const file of files) {
    blocks.push(tarHeader(file.name, file.content.length, file.type ?? '0'));
    const padded = new Uint8Array(Math.ceil(file.content.length / 512) * 512);
    padded.set(file.content);
    blocks.push(padded);
  }
  blocks.push(new Uint8Array(1024));
  return joinBytes(blocks);
}

export function joinBytes(parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

export interface ZipFile {
  name: string;
  /** Already compressed when `method` is 8. */
  data: Uint8Array;
  method: 0 | 8;
  uncompressedSize: number;
}

function zipLocalHeader(file: ZipFile, name: Uint8Array): Uint8Array {
  const header = new Uint8Array(30 + name.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(8, file.method, true);
  view.setUint32(18, file.data.length, true);
  view.setUint32(22, file.uncompressedSize, true);
  view.setUint16(26, name.length, true);
  header.set(name, 30);
  return header;
}

function zipCentralRecord(file: ZipFile, name: Uint8Array, localOffset: number): Uint8Array {
  const record = new Uint8Array(46 + name.length);
  const view = new DataView(record.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(6, 20, true);
  view.setUint16(10, file.method, true);
  view.setUint32(20, file.data.length, true);
  view.setUint32(24, file.uncompressedSize, true);
  view.setUint16(28, name.length, true);
  view.setUint32(42, localOffset, true);
  record.set(name, 46);
  return record;
}

function zipEndRecord(count: number, directorySize: number, directoryOffset: number): Uint8Array {
  const record = new Uint8Array(22);
  const view = new DataView(record.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, count, true);
  view.setUint16(10, count, true);
  view.setUint32(12, directorySize, true);
  view.setUint32(16, directoryOffset, true);
  return record;
}

/** A ZIP of the files; `declaredCount` lets a test lie about the number of entries. */
export function buildZip(files: ZipFile[], declaredCount = files.length): Uint8Array {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = bytesOf(file.name);
    centrals.push(zipCentralRecord(file, name, offset));
    const local = joinBytes([zipLocalHeader(file, name), file.data]);
    locals.push(local);
    offset += local.length;
  }
  const directory = joinBytes(centrals);
  return joinBytes([...locals, directory, zipEndRecord(declaredCount, directory.length, offset)]);
}

export function storedFile(name: string, text: string): ZipFile {
  const data = bytesOf(text);
  return { name, data, method: 0, uncompressedSize: data.length };
}
