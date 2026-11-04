import { useRef } from 'react';

import { usePointerLens } from '../hooks/usePointerLens';
import { Printout } from './Printout';

/**
 * A printout of a log taped to the desk, with a magnifying glass on it. Under the
 * glass the failing lines get the highlighter. The glass drops in when the lamp comes
 * on, follows the pointer and, when nobody is pointing, drifts over the paper by itself.
 */
export function LensStage() {
  const stageRef = useRef<HTMLDivElement>(null);
  usePointerLens(stageRef);

  return (
    <div className="hero-sheet mx-1 sm:mx-4" aria-hidden="true">
      <span className="tape tape-left" />
      <span className="tape tape-right" />
      <div
        ref={stageRef}
        className="hero-stage relative h-[19rem] cursor-none touch-pan-y overflow-hidden select-none sm:h-[23rem] lg:h-[26rem]"
        style={
          { '--x': '55%', '--y': '50%', '--w': '600px', '--h': '416px' } as React.CSSProperties
        }
      >
        <Printout magnified={false} />
        <div className="lens">
          <div className="lens-body">
            <span className="lens-handle" />
            <div className="lens-glass">
              <div className="lens-inner">
                <Printout magnified />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
