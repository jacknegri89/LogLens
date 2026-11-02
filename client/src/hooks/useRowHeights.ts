import { useLayoutEffect, useState, type RefObject } from 'react';

/**
 * Reads how tall each line of the hidden mirror is, so the line numbers can match
 * wrapped lines. It measures again when the text changes or the box is resized.
 */
export function useRowHeights(mirrorRef: RefObject<HTMLDivElement | null>, text: string) {
  const [heights, setHeights] = useState<number[]>([]);

  useLayoutEffect(() => {
    const mirror = mirrorRef.current;
    if (!mirror) return;

    function measure() {
      const next = Array.from(mirror!.children, (row) => (row as HTMLElement).offsetHeight);
      setHeights((prev) => (prev.join() === next.join() ? prev : next));
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(mirror);
    return () => observer.disconnect();
  }, [mirrorRef, text]);

  return heights;
}
