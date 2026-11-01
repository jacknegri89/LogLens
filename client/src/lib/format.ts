import type { Severity } from './types';

/** Visual treatment for each severity: one colour of the spectrum each. */
export const severityMeta: Record<
  Severity,
  { label: string; text: string; border: string; dot: string; glow: string }
> = {
  high: {
    label: 'High',
    text: 'text-high',
    border: 'border-high/35',
    dot: 'bg-high',
    glow: '#ff4f8b',
  },
  medium: {
    label: 'Medium',
    text: 'text-medium',
    border: 'border-medium/35',
    dot: 'bg-medium',
    glow: '#ffc04d',
  },
  low: {
    label: 'Low',
    text: 'text-low',
    border: 'border-low/35',
    dot: 'bg-low',
    glow: '#4fd6ff',
  },
};

/** Colour of a log line by what it says, so the failing lines read at a glance. */
export function lineTone(line: string): string {
  if (/error|exception|fatal|fail|refused|killed/i.test(line)) return 'text-high';
  if (/warn|retry|slow|timeout/i.test(line)) return 'text-medium';
  return 'text-fg-muted';
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
