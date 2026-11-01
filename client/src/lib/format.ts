import type { Severity } from './types';

/** Colour classes for each severity. Colour is used only to carry this meaning. */
export const severityMeta: Record<Severity, { label: string; text: string; border: string }> = {
  high: { label: 'High', text: 'text-high', border: 'border-high' },
  medium: { label: 'Medium', text: 'text-medium', border: 'border-medium' },
  low: { label: 'Low', text: 'text-low', border: 'border-low' },
};

/** Colour of a log line by what it says, so the failing lines stand out. */
export function lineTone(line: string): string {
  if (/error|exception|fatal|fail|refused|killed/i.test(line)) return 'text-high';
  if (/warn|retry|slow|timeout/i.test(line)) return 'text-medium';
  return 'text-ink';
}

/**
 * Finds the line number (1-based) of each key line inside the original log,
 * so the report can point back at the log. Lines that cannot be found are skipped.
 */
export function findLineNumbers(rawLog: string, keyLines: string[]): Map<string, number> {
  const logLines = rawLog.split('\n').map((line) => line.trim());
  const found = new Map<string, number>();
  for (const keyLine of keyLines) {
    const index = logLines.indexOf(keyLine.trim());
    if (index !== -1) {
      found.set(keyLine, index + 1);
    }
  }
  return found;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** Trigger a client-side download of a Markdown file. */
export function downloadMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
