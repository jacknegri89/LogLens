const UNITS = ['B', 'KB', 'MB', 'GB'];

/** A file size people can read at a glance: 940 B, 12.4 KB, 3.1 MB. */
export function formatFileSize(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  let digits = 1;
  if (unit === 0 || value >= 100) {
    digits = 0;
  }
  return `${value.toFixed(digits)} ${UNITS[unit]}`;
}
