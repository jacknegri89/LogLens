export type FileReadResult =
  | { ok: true; text: string }
  | { ok: false; reason: 'tooBig' | 'unreadable' };

export const MEGABYTE = 1024 * 1024;

/** Reads a file the visitor chose, refusing anything above the limit before reading it. */
export async function readTextFile(file: File, maxBytes: number): Promise<FileReadResult> {
  if (file.size > maxBytes) return { ok: false, reason: 'tooBig' };
  try {
    return { ok: true, text: await file.text() };
  } catch {
    return { ok: false, reason: 'unreadable' };
  }
}
