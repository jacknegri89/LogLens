import { useEffect, useRef } from 'react';

/**
 * The hero: a printout of a log with a magnifying glass on it. Under the glass the
 * failing lines get marked with a highlighter. The glass follows the pointer and,
 * when nobody is pointing, drifts over the paper by itself.
 */

interface PrintLine {
  text: string;
  failing: boolean;
}

const PRINTOUT: PrintLine[] = [
  { text: '09:14:01 INFO  server listening on :8080', failing: false },
  { text: '09:14:01 INFO  loaded 3 routes from config', failing: false },
  { text: '09:14:02 DEBUG GET /health 200 2ms', failing: false },
  { text: '09:14:05 WARN  pool at 18/20 connections', failing: false },
  { text: '09:14:07 ERROR connect ECONNREFUSED 10.0.2.15:5432', failing: true },
  { text: '09:14:07 INFO  retrying in 500ms (attempt 1/5)', failing: false },
  { text: '09:14:08 DEBUG GET /api/users 200 41ms', failing: false },
  { text: '09:14:11 ERROR unhandled rejection: TypeError', failing: true },
  { text: '          at buildReport (report.ts:42:28)', failing: true },
  { text: '09:14:11 INFO  worker 4 restarted', failing: false },
  { text: '09:14:15 DEBUG POST /api/analyses 201 118ms', failing: false },
  { text: '09:14:19 WARN  slow query: 2341ms', failing: false },
  { text: '09:14:22 INFO  health check passed', failing: false },
  { text: '09:14:26 DEBUG cache hit ratio 0.91', failing: false },
  { text: '09:14:30 INFO  scheduled job finished', failing: false },
];

function Printout({ magnified }: { magnified: boolean }) {
  return (
    <div className="bands perforated absolute inset-0 overflow-hidden pt-0 pl-10 font-mono text-[14px] leading-[22px] text-ink">
      {PRINTOUT.map((line, i) => {
        let lineClass = 'text-ink-soft';
        if (magnified && line.failing) {
          lineClass = 'bg-marker font-bold text-pen';
        }
        return (
          <div key={i} className={`whitespace-pre ${lineClass}`}>
            {line.text}
          </div>
        );
      })}
    </div>
  );
}

export function LensStage() {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lens = stage.querySelector<HTMLElement>('.lens');
    let pointerInside = false;
    let frame = 0;

    function moveLens(x: number, y: number) {
      stage?.style.setProperty('--x', `${x}px`);
      stage?.style.setProperty('--y', `${y}px`);
    }

    function measure() {
      stage?.style.setProperty('--w', `${stage.clientWidth}px`);
      stage?.style.setProperty('--h', `${stage.clientHeight}px`);
    }

    function onMove(event: PointerEvent) {
      const box = stage?.getBoundingClientRect();
      if (!box) return;
      pointerInside = true;
      moveLens(event.clientX - box.left, event.clientY - box.top);
    }

    // Touch: keep the finger's gesture on the glass and let go of it cleanly.
    function onDown(event: PointerEvent) {
      if (event.pointerType === 'mouse') return;
      stage?.setPointerCapture(event.pointerId);
      onMove(event);
    }

    function onLeave() {
      pointerInside = false;
    }

    // Without a pointer the glass wanders slowly across the paper.
    function drift(time: number) {
      if (stage && !pointerInside) {
        const x = stage.clientWidth * (0.36 + 0.22 * Math.sin(time / 2600));
        const y = stage.clientHeight * (0.5 + 0.28 * Math.sin(time / 1700 + 1));
        moveLens(x, y);
      }
      frame = requestAnimationFrame(drift);
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    lens?.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerleave', onLeave);
    stage.addEventListener('pointerup', onLeave);
    stage.addEventListener('pointercancel', onLeave);

    if (reduceMotion) {
      moveLens(stage.clientWidth * 0.55, stage.clientHeight * 0.5);
    } else {
      frame = requestAnimationFrame(drift);
    }

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      lens?.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerleave', onLeave);
      stage.removeEventListener('pointerup', onLeave);
      stage.removeEventListener('pointercancel', onLeave);
    };
  }, []);

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
