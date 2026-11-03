import { useCallback, useEffect, useState, type RefObject, type UIEvent } from 'react';

/** The scroll position and visible height of a scrolling list, kept up to date. */
export function useListViewport(listRef: RefObject<HTMLElement | null>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const element = listRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setHeight(entry.contentRect.height));
    observer.observe(element);
    return () => observer.disconnect();
  }, [listRef]);

  const onScroll = useCallback((event: UIEvent<HTMLElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return { scrollTop, height, onScroll };
}
