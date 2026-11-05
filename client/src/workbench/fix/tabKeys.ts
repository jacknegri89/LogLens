/** The tab to focus after a key press in a tab list, or null when the key does nothing there. */
export function nextTabIndex(key: string, index: number, count: number): number | null {
  if (count <= 0) {
    return null;
  }
  if (key === 'ArrowRight') {
    return (index + 1) % count;
  }
  if (key === 'ArrowLeft') {
    return (index - 1 + count) % count;
  }
  if (key === 'Home') {
    return 0;
  }
  if (key === 'End') {
    return count - 1;
  }
  return null;
}
