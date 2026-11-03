import { useEffect } from 'react';

/** Stops the page behind a dialog from scrolling while the dialog is open. */
export function useLockPageScroll(): void {
  useEffect(() => {
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = previous;
    };
  }, []);
}
