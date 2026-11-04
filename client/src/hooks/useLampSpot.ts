import { useEffect, type RefObject } from 'react';

/**
 * A desk lamp that follows the mouse: a soft pool of light moves across the dark desk. It only runs
 * with a fine pointer, since a touch screen has no hover, and it writes one CSS variable per frame.
 */
export function useLampSpot(deskRef: RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    const desk = deskRef.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    if (!desk || reduceMotion || !finePointer) return;

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (frame !== 0) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const box = desk.getBoundingClientRect();
        desk.style.setProperty('--lamp-x', `${event.clientX - box.left}px`);
        desk.style.setProperty('--lamp-y', `${event.clientY - box.top}px`);
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, [deskRef]);
}
