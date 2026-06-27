import type { Severity } from './types';

/** Visual treatment for each severity, reused by badges and accents. */
export const severityMeta: Record<Severity, { label: string; badge: string; dot: string }> = {
  high: { label: 'High', badge: 'text-high border-high/20 bg-high/8 rounded-sm', dot: 'bg-high' },
  medium: { label: 'Medium', badge: 'text-medium border-medium/20 bg-medium/8 rounded-sm', dot: 'bg-medium' },
  low: { label: 'Low', badge: 'text-low border-low/20 bg-low/8 rounded-sm', dot: 'bg-low' },
};

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
