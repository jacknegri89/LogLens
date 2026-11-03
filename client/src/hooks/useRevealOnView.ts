import { useLayoutEffect, type RefObject } from 'react';

/**
 * Holds a one-off entrance animation until its element is on screen: `data-reveal` is
 * "waiting" (the CSS keeps the animation paused) and turns "playing" the first time the
 * element is seen. Set before the first paint, so the final state never flashes.
 */
export function useRevealOnView(elementRef: RefObject<HTMLElement | null>, threshold = 0.25) {
  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element || element.dataset.reveal === 'playing') return;
    if (typeof IntersectionObserver === 'undefined') {
      element.dataset.reveal = 'playing';
      return;
    }
    element.dataset.reveal = 'waiting';
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        element.dataset.reveal = 'playing';
        observer.disconnect();
      },
      { threshold },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [elementRef, threshold]);
}
