import { useEffect, useState, type RefObject } from 'react';

import { threadPath, type Point, type ThreadLink } from '../lib/thread';

export interface ThreadGeometry {
  width: number;
  height: number;
  threads: { key: string; path: string; from: Point; to: Point }[];
}

/**
 * Where the red threads run on the board: from pin to pin, measured from the cards as laid
 * out, and measured again whenever the board changes size (new width, fonts loaded).
 * Each pin carries `data-pin` with the index of its timeline entry.
 */
export function useThreadGeometry(
  boardRef: RefObject<HTMLElement | null>,
  links: ThreadLink[],
): ThreadGeometry | null {
  const [geometry, setGeometry] = useState<ThreadGeometry | null>(null);

  useEffect(() => {
    const board = boardRef.current;
    if (!board || links.length === 0 || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setGeometry(measureThreads(board, links)));
    observer.observe(board);
    return () => observer.disconnect();
  }, [boardRef, links]);

  return geometry;
}

function measureThreads(board: HTMLElement, links: ThreadLink[]): ThreadGeometry {
  const origin = board.getBoundingClientRect();
  const pinAt = (index: number) => pinCentre(board, index, origin);
  const threads = links.flatMap(({ rootIndex, effectIndex }) => {
    const from = pinAt(rootIndex);
    const to = pinAt(effectIndex);
    if (!from || !to) return [];
    return [{ key: `${rootIndex}-${effectIndex}`, path: threadPath(from, to), from, to }];
  });
  return { width: origin.width, height: origin.height, threads };
}

function pinCentre(board: HTMLElement, index: number, origin: DOMRect): Point | null {
  const pin = board.querySelector(`[data-pin="${index}"]`);
  if (!pin) return null;
  const rect = pin.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2 - origin.left,
    y: rect.top + rect.height / 2 - origin.top,
  };
}
