/** The homepage row's movement as plain numbers, so it feels the same at any screen rate (Decision 30). */

export const SECONDS_PER_CARD = 9;
export const MOMENTUM_TAU = 0.5;
export const PAUSE_TAU = 0.2;
export const RESUME_TAU = 0.4;
export const PUSH_RISE_TAU = 0.16;
export const PUSH_FALL_TAU = 0.5;
export const PUSH_SCALE = 0.14;
export const PUSH_CAP = 320;
export const FLING_CAP = 2800;
export const DRAG_START = 6;
export const MIN_DRIFT_CARDS = 3;
export const MIN_FILL = 1.5;

export type DriftNumbers = {
  x: number;
  /** Momentum from a swipe or drag, in pixels a second. */
  velocity: number;
  /** How much of the slow drift is on, from 0 to 1. */
  drift: number;
  push: number;
  pushTarget: number;
};

const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

export const capFling = (speed: number) => clamp(speed, FLING_CAP);
export const scalePush = (scrollSpeed: number) => clamp(scrollSpeed * PUSH_SCALE, PUSH_CAP);

/** Moves everything on by dt seconds. Each part is solved exactly, so frame length doesn't change the path. */
export function stepDrift(state: DriftNumbers, dt: number, baseSpeed: number, driftTarget: number) {
  const momentumLeft = Math.exp(-dt / MOMENTUM_TAU);
  const momentumDistance = state.velocity * MOMENTUM_TAU * (1 - momentumLeft);

  const tau = driftTarget > state.drift ? RESUME_TAU : PAUSE_TAU;
  const driftLeft = Math.exp(-dt / tau);
  const driftDistance = baseSpeed * (driftTarget * dt + (state.drift - driftTarget) * tau * (1 - driftLeft));

  const pushStart = state.push;
  const pushLeft = Math.exp(-dt / PUSH_RISE_TAU);
  const pushEnd = state.pushTarget + (pushStart - state.pushTarget) * pushLeft;
  const pushDistance = ((pushStart + pushEnd) / 2) * dt;

  state.x += momentumDistance + driftDistance + pushDistance;
  state.velocity *= momentumLeft;
  state.drift = driftTarget + (state.drift - driftTarget) * driftLeft;
  state.push = pushEnd;
  state.pushTarget *= Math.exp(-dt / PUSH_FALL_TAU);
}

export const shouldDrift = (cards: number, setWidth: number, rowWidth: number) =>
  cards >= MIN_DRIFT_CARDS && setWidth >= rowWidth * MIN_FILL;

/** Where the row should sit for a card to be fully on screen; unchanged if it already is. */
export function targetForCard(index: number, x: number, step: number, cardWidth: number, rowWidth: number, gutter: number) {
  const start = index * step;
  if (start < x) return start;
  const lastFit = start - (rowWidth - cardWidth - gutter * 2);
  return lastFit > x ? lastFit : x;
}

/** Whole loops look identical, so the row can start a glide from whichever loop is nearest. */
export function nearestLoop(x: number, target: number, setWidth: number, highest: number) {
  const options = [x, x - setWidth, x + setWidth].filter((option) => option <= highest);
  return options.reduce((best, option) => (Math.abs(option - target) < Math.abs(best - target) ? option : best), x);
}
