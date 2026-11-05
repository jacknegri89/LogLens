/** Where the arrow keys, Home and End move inside a tab list. Any other key returns null. */
export function nextTabIndex(current: number, key: string, count: number): number | null {
  if (count <= 0) {
    return null;
  }
  if (key === 'ArrowRight') {
    return (current + 1) % count;
  }
  if (key === 'ArrowLeft') {
    return (current - 1 + count) % count;
  }
  if (key === 'Home') {
    return 0;
  }
  if (key === 'End') {
    return count - 1;
  }
  return null;
}
