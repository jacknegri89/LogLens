import { describe, expect, it } from 'vitest';

import { ArchiveError, type ArchiveErrorKind } from './archiveError';
import { detectFormat, extractLogText } from './extractLogText';
import {
  buildTar,
  buildZip,
  bytesOf,
  compress,
  joinBytes,
  storedFile,
  type ZipFile,
} from './testArchives';

const SMALL_LIMITS = { maxTotalBytes: 1000, maxEntries: 3 };

async function failureOf(promise: Promise<unknown>): Promise<ArchiveErrorKind | 'none'> {
  try {
    await promise;
    return 'none';
  } catch (error) {
    if (error instanceof ArchiveError) {
      return error.kind;
    }
    return 'none';
  }
}

async function deflatedFile(name: string, text: string): Promise<ZipFile> {
  const raw = bytesOf(text);
  return {
    name,
    data: await compress(raw, 'deflate-raw'),
    method: 8,
    uncompressedSize: raw.length,
  };
}

describe('plain text and gzip', () => {
  it('reads a plain log as it is', async () => {
    expect(await extractLogText('app.log', bytesOf('INFO one\nERROR two'))).toBe(
      'INFO one\nERROR two',
    );
  });

  it('gunzips a .gz log in the browser', async () => {
    const gzipped = await compress(bytesOf('ERROR from gzip'), 'gzip');
    expect(await extractLogText('app.log.gz', gzipped)).toBe('ERROR from gzip');
  });

  it('reports a truncated gzip as corrupt', async () => {
    const gzipped = await compress(bytesOf('ERROR '.repeat(200)), 'gzip');
    expect(await failureOf(extractLogText('app.gz', gzipped.subarray(0, 20)))).toBe('corrupt');
  });

  it('stops a gzip bomb at the limit', async () => {
    const bomb = await compress(new Uint8Array(100_000).fill(65), 'gzip');
    expect(bomb.length).toBeLessThan(SMALL_LIMITS.maxTotalBytes);
    expect(await failureOf(extractLogText('bomb.gz', bomb, SMALL_LIMITS))).toBe('tooBig');
  });

  it('refuses binary and unknown compressed files', async () => {
    expect(await failureOf(extractLogText('photo.png', new Uint8Array([137, 80, 0, 1])))).toBe(
      'unsupported',
    );
    expect(await failureOf(extractLogText('logs.7z', bytesOf('7z')))).toBe('unsupported');
  });

  it('refuses a file bigger than the limit before reading it', async () => {
    const big = bytesOf('x'.repeat(1001));
    expect(await failureOf(extractLogText('big.log', big, SMALL_LIMITS))).toBe('tooBig');
  });
});

describe('zip', () => {
  it('joins stored and deflated text entries in name order, skipping folders and binaries', async () => {
    const zip = buildZip([
      storedFile('logs/', ''),
      await deflatedFile('logs/worker.log', 'ERROR worker\n'),
      storedFile('logs/api.log', 'INFO api'),
      { name: 'logo.png', data: new Uint8Array([0, 1, 2]), method: 0, uncompressedSize: 3 },
    ]);

    expect(await extractLogText('bundle.zip', zip)).toBe(
      '# ---- logs/api.log ----\nINFO api\n# ---- logs/worker.log ----\nERROR worker',
    );
  });

  it('gives a single entry without a heading', async () => {
    expect(await extractLogText('one.zip', buildZip([storedFile('a.log', 'WARN a')]))).toBe(
      'WARN a',
    );
  });

  it('refuses too many entries', async () => {
    const zip = buildZip([storedFile('a.log', 'a')], 501);
    expect(await failureOf(extractLogText('many.zip', zip))).toBe('tooManyEntries');
  });

  it('refuses a declared size over the limit before inflating', async () => {
    const lying = { ...storedFile('a.log', 'a'), uncompressedSize: 5000 };
    expect(await failureOf(extractLogText('big.zip', buildZip([lying]), SMALL_LIMITS))).toBe(
      'tooBig',
    );
  });

  it('stops a deflate bomb that lies about its size', async () => {
    const bomb = { ...(await deflatedFile('bomb.log', 'A'.repeat(100_000))), uncompressedSize: 10 };
    expect(await failureOf(extractLogText('bomb.zip', buildZip([bomb]), SMALL_LIMITS))).toBe(
      'tooBig',
    );
  });

  it('reports a cut archive as corrupt and an archive with no text as empty', async () => {
    const zip = buildZip([storedFile('a.log', 'INFO a')]);
    expect(await failureOf(extractLogText('cut.zip', zip.subarray(0, 30)))).toBe('corrupt');
    const binaryOnly = buildZip([
      { name: 'x.bin', data: new Uint8Array([0, 0]), method: 0, uncompressedSize: 2 },
    ]);
    expect(await failureOf(extractLogText('bin.zip', binaryOnly))).toBe('noText');
  });

  it('says a .zip that is not a zip is corrupt', async () => {
    expect(await failureOf(extractLogText('fake.zip', bytesOf('hello')))).toBe('corrupt');
  });
});

describe('tar', () => {
  const tar = buildTar([
    { name: 'var/log/', content: new Uint8Array(0), type: '5' },
    { name: 'var/log/b.log', content: bytesOf('ERROR b\n') },
    { name: 'var/log/a.log', content: bytesOf('INFO a\n') },
  ]);

  it('reads a .tar and joins its files in name order', async () => {
    expect(await extractLogText('logs.tar', tar)).toBe(
      '# ---- var/log/a.log ----\nINFO a\n# ---- var/log/b.log ----\nERROR b',
    );
  });

  it('reads a .tar.gz and a .tgz', async () => {
    const gzipped = await compress(tar, 'gzip');
    expect(await extractLogText('logs.tar.gz', gzipped)).toContain('ERROR b');
    expect(await extractLogText('logs.tgz', gzipped)).toContain('INFO a');
  });

  it('refuses a damaged header and a cut file', async () => {
    const damaged = tar.slice();
    damaged[600] = 0x41;
    expect(await failureOf(extractLogText('bad.tar', damaged))).toBe('corrupt');
    expect(await failureOf(extractLogText('cut.tar', tar.subarray(0, 1030)))).toBe('corrupt');
  });

  it('refuses too many entries', async () => {
    const files = ['1', '2', '3', '4'].map((name) => ({ name, content: bytesOf(name) }));
    const limits = { ...SMALL_LIMITS, maxTotalBytes: 100_000 };
    expect(await failureOf(extractLogText('many.tar', buildTar(files), limits))).toBe(
      'tooManyEntries',
    );
  });
});

describe('detectFormat', () => {
  it('trusts the bytes over the name', async () => {
    expect(detectFormat('notes.txt', await compress(bytesOf('x'), 'gzip'))).toBe('gzip');
    expect(detectFormat('logs.gz', buildZip([storedFile('a', 'a')]))).toBe('zip');
    expect(detectFormat('dump', buildTar([{ name: 'a', content: bytesOf('a') }]))).toBe('tar');
  });

  it('falls back to the name, then to the content', () => {
    expect(detectFormat('app.log', bytesOf('INFO'))).toBe('text');
    expect(detectFormat('app.log', joinBytes([bytesOf('a'), new Uint8Array([0])]))).toBe(
      'unsupported',
    );
  });
});
