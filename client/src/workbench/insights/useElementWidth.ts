import { useCallback, useSyncExternalStore } from 'react';

/** The width of an element in pixels, kept current while it is resized. 0 until it is mounted. */
export function useElementWidth(element: HTMLElement | null): number {
  const subscribe = useCallback(
    (notify: () => void) => {
      if (!element) {
        return () => undefined;
      }
      const observer = new ResizeObserver(notify);
      observer.observe(element);
      return () => observer.disconnect();
    },
    [element],
  );
  return useSyncExternalStore(
    subscribe,
    () => element?.clientWidth ?? 0,
    () => 0,
  );
}
