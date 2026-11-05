import { useEffect, useState } from 'react';

/** Smaller movements are ignored, so a finger jiggle or a tiny bounce does not flicker the header. */
const SCROLL_JITTER_PX = 8;

/** Near the top of the page the header always shows. */
const ALWAYS_SHOWN_BELOW_PX = 16;

/**
 * Whether the sticky header should be visible. It hides while the page scrolls down to make room
 * for the content, and comes back as soon as the page scrolls up or sits near the top.
 */
export function useHeaderVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // The scroll position at the last change of direction, so slow scrolling still counts.
    let lastScrollY = window.scrollY;

    function handleScroll() {
      const currentScrollY = window.scrollY;
      if (currentScrollY <= ALWAYS_SHOWN_BELOW_PX) {
        setIsVisible(true);
        lastScrollY = currentScrollY;
        return;
      }

      const scrolledBy = currentScrollY - lastScrollY;
      if (Math.abs(scrolledBy) < SCROLL_JITTER_PX) {
        return;
      }

      const isScrollingDown = scrolledBy > 0;
      setIsVisible(!isScrollingDown);
      lastScrollY = currentScrollY;
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return isVisible;
}
