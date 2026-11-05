import { useEffect, type RefObject } from 'react';

/**
 * Pauses the CSS animations inside an element while it is off screen or the tab is
 * hidden, by setting `data-paused` on it. No re-render: the attribute is set directly.
 */
export function useMotionPause(elementRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }

    let inView = true;
    const update = () => {
      element.dataset.paused = String(!inView || document.hidden);
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update();
    });
    observer.observe(element);
    document.addEventListener('visibilitychange', update);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, [elementRef]);
}
