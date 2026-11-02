import { useEffect, type RefObject } from 'react';

/** Where the glass drifts by itself when nobody is pointing (fractions of the stage). */
const DRIFT_X = { centre: 0.36, swing: 0.22, period: 2600 };
const DRIFT_Y = { centre: 0.5, swing: 0.28, period: 1700, phase: 1 };
const REST_POSITION = { x: 0.55, y: 0.5 };
const RELEASE_EVENTS = ['pointerleave', 'pointerup', 'pointercancel'] as const;

interface LensState {
  pointerInside: boolean;
  frame: number;
}

/** Moves the magnifying glass with the pointer, or lets it drift when no one points. */
export function usePointerLens(stageRef: RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    return startLens(stage);
  }, [stageRef]);
}

function startLens(stage: HTMLDivElement): () => void {
  const state: LensState = { pointerInside: false, frame: 0 };
  const stopListening = listen(stage, state);
  const stopMoving = animate(stage, state);
  const stopMeasuring = measure(stage);

  return () => {
    stopMoving();
    stopMeasuring();
    stopListening();
  };
}

function listen(stage: HTMLDivElement, state: LensState): () => void {
  const lens = stage.querySelector<HTMLElement>('.lens');
  const onMove = (event: PointerEvent) => followPointer(stage, event, state);
  const onDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') return;
    stage.setPointerCapture(event.pointerId);
    onMove(event);
  };
  const onRelease = () => {
    state.pointerInside = false;
  };

  lens?.addEventListener('pointerdown', onDown);
  stage.addEventListener('pointermove', onMove);
  RELEASE_EVENTS.forEach((type) => stage.addEventListener(type, onRelease));

  return () => {
    lens?.removeEventListener('pointerdown', onDown);
    stage.removeEventListener('pointermove', onMove);
    RELEASE_EVENTS.forEach((type) => stage.removeEventListener(type, onRelease));
  };
}

function followPointer(stage: HTMLDivElement, event: PointerEvent, state: LensState): void {
  const box = stage.getBoundingClientRect();
  state.pointerInside = true;
  setLensPosition(stage, event.clientX - box.left, event.clientY - box.top);
}

function animate(stage: HTMLDivElement, state: LensState): () => void {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    setLensPosition(
      stage,
      stage.clientWidth * REST_POSITION.x,
      stage.clientHeight * REST_POSITION.y,
    );
    return () => {};
  }

  const step = (time: number) => {
    if (!state.pointerInside) driftTo(stage, time);
    state.frame = requestAnimationFrame(step);
  };
  state.frame = requestAnimationFrame(step);
  return () => cancelAnimationFrame(state.frame);
}

function driftTo(stage: HTMLDivElement, time: number): void {
  const x = stage.clientWidth * (DRIFT_X.centre + DRIFT_X.swing * Math.sin(time / DRIFT_X.period));
  const y =
    stage.clientHeight *
    (DRIFT_Y.centre + DRIFT_Y.swing * Math.sin(time / DRIFT_Y.period + DRIFT_Y.phase));
  setLensPosition(stage, x, y);
}

/** Keeps the CSS sizes in step with the stage, so the zoomed copy lines up. */
function measure(stage: HTMLDivElement): () => void {
  const update = () => {
    stage.style.setProperty('--w', `${stage.clientWidth}px`);
    stage.style.setProperty('--h', `${stage.clientHeight}px`);
  };
  update();
  const observer = new ResizeObserver(update);
  observer.observe(stage);
  return () => observer.disconnect();
}

function setLensPosition(stage: HTMLDivElement, x: number, y: number): void {
  stage.style.setProperty('--x', `${x}px`);
  stage.style.setProperty('--y', `${y}px`);
}
