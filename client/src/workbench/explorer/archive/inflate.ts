import { ArchiveError } from './archiveError';

function concatenate(chunks: Uint8Array[], total: number): Uint8Array {
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

async function readAtMost(reader: ReadableStreamDefaultReader<Uint8Array>, maxBytes: number) {
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      return concatenate(chunks, total);
    }
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new ArchiveError('tooBig');
    }
    chunks.push(value);
  }
}

export function streamOf(bytes: Uint8Array): ReadableStream<BufferSource> {
  return new ReadableStream<BufferSource>({
    start(controller) {
      // File, fetch and TextEncoder bytes always sit on a plain ArrayBuffer, never a shared one.
      controller.enqueue(bytes as Uint8Array<ArrayBuffer>);
      controller.close();
    },
  });
}

/**
 * Decompresses with the browser's own DecompressionStream and stops as soon as the output
 * passes `maxBytes`, so a tiny bomb never fills the memory.
 */
export async function inflate(
  bytes: Uint8Array,
  format: 'gzip' | 'deflate-raw',
  maxBytes: number,
): Promise<Uint8Array> {
  try {
    const output = streamOf(bytes).pipeThrough(new DecompressionStream(format));
    return await readAtMost(output.getReader(), maxBytes);
  } catch (error) {
    if (error instanceof ArchiveError) {
      throw error;
    }
    throw new ArchiveError('corrupt');
  }
}

export function isGzip(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}

export function gunzip(bytes: Uint8Array, maxBytes: number): Promise<Uint8Array> {
  if (!isGzip(bytes)) {
    return Promise.reject(new ArchiveError('corrupt'));
  }
  return inflate(bytes, 'gzip', maxBytes);
}
