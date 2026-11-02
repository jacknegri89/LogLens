import { useRef } from 'react';

import { usePointerLens } from '../hooks/usePointerLens';
import { Printout } from './Printout';

/**
 * The hero: a printout of a log with a magnifying glass on it. Under the glass the
 * failing lines get marked with a highlighter. The glass follows the pointer and,
 * when nobody is pointing, drifts over the paper by itself.
 */
export function LensStage() {
  const stageRef = useRef<HTMLDivElement>(null);
  usePointerLens(stageRef);

  return (
    <div
      ref={stageRef}
      className="relative h-[19rem] cursor-none touch-pan-y select-none overflow-hidden shadow-[0_24px_40px_-18px_rgb(0_0_0/0.6)] sm:h-[23rem]"
      style={{ '--x': '55%', '--y': '50%', '--w': '600px', '--h': '368px' } as React.CSSProperties}
      aria-hidden="true"
    >
      <Printout magnified={false} />
      <div className="lens">
        <span className="lens-handle" />
        <div className="lens-glass">
          <div className="lens-inner">
            <Printout magnified />
          </div>
        </div>
      </div>
    </div>
  );
}
