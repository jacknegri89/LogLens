import type { TimeMode } from '../types';

/** A short date and time for the first and last sighting of a cluster. Relative mode shows UTC. */
export function formatClusterTime(timestamp: number, mode: TimeMode): string {
  const date = new Date(timestamp);
  if (mode === 'local') {
    return date.toLocaleString([], {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }
  return date.toISOString().slice(5, 19).replace('T', ' ');
}
