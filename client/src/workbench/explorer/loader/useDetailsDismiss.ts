import { useEffect, type RefObject } from 'react';

/** Closes an open <details> menu on a press outside it or on Escape (focus returns to its summary). */
export function useDetailsDismiss(detailsRef: RefObject<HTMLDetailsElement | null>): void {
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      const details = detailsRef.current;
      if (details?.open && !details.contains(event.target as Node)) {
        details.open = false;
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      const details = detailsRef.current;
      if (event.key !== 'Escape' || !details?.open) {
        return;
      }
      details.open = false;
      details.querySelector('summary')?.focus();
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [detailsRef]);
}
