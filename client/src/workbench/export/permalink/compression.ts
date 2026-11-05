import { PermalinkError } from './permalinkError';

type ByteTransform = ReadableWritablePair<Uint8Array, Uint8Array>;

// The DOM typings of CompressionStream do not match pipeThrough's, hence the cast in one place.
function pipeBytes(bytes: Uint8Array, transform: CompressionStream | DecompressionStream) {
  const source = new Blob([bytes as BlobPart]).stream() as unknown as ReadableStream<Uint8Array>;
  return source.pipeThrough(transform as unknown as ByteTransform);
}

/** Compresses with raw deflate, the format the browser's CompressionStream writes. */
export async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = pipeBytes(bytes, new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream as BodyInit).arrayBuffer());
}

async function readAll(reader: ReadableStreamDefaultReader<Uint8Array>, limit: number) {
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (let part = await reader.read(); !part.done; part = await reader.read()) {
    total += part.value.length;
    if (total > limit) {
      await reader.cancel();
      throw new PermalinkError('too-large');
    }
    chunks.push(part.value);
  }
  return { chunks, total };
}

/**
 * Decompresses raw deflate. Reading stops once the output passes `limit` bytes, so a tiny link
 * that expands into gigabytes cannot freeze the page.
 */
export async function inflate(bytes: Uint8Array, limit: number): Promise<Uint8Array> {
  const stream = pipeBytes(bytes, new DecompressionStream('deflate-raw'));
  try {
    const { chunks, total } = await readAll(stream.getReader(), limit);
    const joined = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      joined.set(chunk, offset);
      offset += chunk.length;
    }
    return joined;
  } catch (failure) {
    if (failure instanceof PermalinkError) {
      throw failure;
    }
    throw new PermalinkError('corrupt');
  }
}
