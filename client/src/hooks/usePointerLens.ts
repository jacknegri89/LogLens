import { useEffect, type RefObject } from 'react';

/** Where the glass drifts by itself when nobody is pointing (fractions of the stage). */
const DRIFT_X = { centre: 0.36, swing: 0.22, period: 2600 };
const DRIFT_Y = { centre: 0.5, swing: 0.28, period: 1700, phase: 1 };
const REST_POSITION = { x: 0.55, y: 0.5 };
const RELEASE_EVENTS = ['pointerleave', 'pointerup', 'pointercancel'] as const;
/** How fast the glass catches up with its target: a fraction of the distance per frame. */
const FOLLOW_SPEED = 0.14;
/** The glass tilts a little in the direction it moves, like a heavy glass being dragged. */
const MAX_TILT_DEG = 8;
const TILT_PER_PX = 0.4;

interface Point {
  x: number;
  y: number;
}

interface LensState {
  pointerInside: boolean;
  frame: number;
  target: Point;
  current: Point;
  previous: Point;
}

/** Moves the magnifying glass with the pointer, or lets it drift when no one points. */
export function usePointerLens(stageRef: RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    return startLens(stage);
  }, [stageRef]);
}

function startLens(stage: HTMLDivElement): () => void {
  const rest = restPoint(stage);
  const state: LensState = {
    pointerInside: false,
    frame: 0,
    target: rest,
    current: { ...rest },
    previous: { ...rest },
  };
  const stopListening = listen(stage, state);
  const stopMoving = animate(stage, state);
  const stopMeasuring = measure(stage);

  return () => {
    stopMoving();
    stopMeasuring();
    stopListening();
  };
}

function restPoint(stage: HTMLDivElement): Point {
  return {
    x: stage.clientWidth * REST_POSITION.x,
    y: stage.clientHeight * REST_POSITION.y,
  };
}

function listen(stage: HTMLDivElement, state: LensState): () => void {
  const lens = stage.querySelector<HTMLElement>('.lens');
  const onMove = (event: PointerEvent) => followPointer(stage, event, state);
  const onDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') {
      return;
    }
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
  state.target = { x: event.clientX - box.left, y: event.clientY - box.top };
}

function animate(stage: HTMLDivElement, state: LensState): () => void {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    setLensPosition(stage, restPoint(stage));
    return () => {};
  }

  const step = (time: number) => {
    if (!state.pointerInside) {
      state.target = driftTarget(stage, time);
    }
    glideToward(stage, state);
    state.frame = requestAnimationFrame(step);
  };
  // The browser already stops frames in a hidden tab; this also stops them off screen.
  const observer = new IntersectionObserver(([entry]) => {
    cancelAnimationFrame(state.frame);
    if (entry.isIntersecting) {
      state.frame = requestAnimationFrame(step);
    }
  });
  observer.observe(stage);
  return () => {
    observer.disconnect();
    cancelAnimationFrame(state.frame);
  };
}

function driftTarget(stage: HTMLDivElement, time: number): Point {
  const x = stage.clientWidth * (DRIFT_X.centre + DRIFT_X.swing * Math.sin(time / DRIFT_X.period));
  const y =
    stage.clientHeight *
    (DRIFT_Y.centre + DRIFT_Y.swing * Math.sin(time / DRIFT_Y.period + DRIFT_Y.phase));
  return { x, y };
}

/** Moves the glass a step toward its target, so it has weight, and tilts it with its speed. */
function glideToward(stage: HTMLDivElement, state: LensState): void {
  const { current, target, previous } = state;
  current.x += (target.x - current.x) * FOLLOW_SPEED;
  current.y += (target.y - current.y) * FOLLOW_SPEED;
  const horizontalSpeed = current.x - previous.x;
  previous.x = current.x;
  previous.y = current.y;
  setLensPosition(stage, current);
  const tiltDeg = clamp(horizontalSpeed * TILT_PER_PX, -MAX_TILT_DEG, MAX_TILT_DEG);
  stage.style.setProperty('--tilt', `${tiltDeg}deg`);
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
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

function setLensPosition(stage: HTMLDivElement, point: Point): void {
  stage.style.setProperty('--x', `${point.x}px`);
  stage.style.setProperty('--y', `${point.y}px`);
}
