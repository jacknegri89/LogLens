import { ArchiveError, type ArchiveEntry } from './archiveError';

const SAMPLE_SIZE = 8000;
const CONTROL_SHARE = 0.1;

function isControlByte(byte: number): boolean {
  // Tab, newlines, form feed and ESC (ANSI colours) are normal in logs.
  return byte < 9 || (byte > 13 && byte < 32 && byte !== 27);
}

/** True for images, executables and other files that are not text: a NUL byte or many controls. */
export function looksBinary(bytes: Uint8Array): boolean {
  const end = Math.min(bytes.length, SAMPLE_SIZE);
  let controls = 0;
  for (let position = 0; position < end; position += 1) {
    if (bytes[position] === 0) return true;
    if (isControlByte(bytes[position])) controls += 1;
  }
  return end > 0 && controls / end > CONTROL_SHARE;
}

export function decodeText(bytes: Uint8Array): string {
  return new TextDecoder('utf-8').decode(bytes);
}

/** Entry names come from the archive: control characters could fake extra log lines. */
function safeName(name: string): string {
  return Array.from(name, (character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127 ? '?' : character;
  }).join('');
}

function byName(first: ArchiveEntry, second: ArchiveEntry): number {
  if (first.name === second.name) return 0;
  return first.name < second.name ? -1 : 1;
}

/** One log from the text files of an archive, in name order, each under a `# ---- name ----` line. */
export function joinEntries(entries: readonly ArchiveEntry[]): string {
  if (entries.length === 0) throw new ArchiveError('noText');
  if (entries.length === 1) return entries[0].text;
  return [...entries]
    .sort(byName)
    .map((entry) => `# ---- ${safeName(entry.name)} ----\n${entry.text.replace(/\r?\n$/, '')}`)
    .join('\n');
}
