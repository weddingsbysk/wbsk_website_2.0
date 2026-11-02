import { describe, expect, it } from "vitest";
import { capFling, FLING_CAP, nearestLoop, PUSH_CAP, roundsToFill, scalePush, shouldDrift, stepDrift, targetForCard, type DriftNumbers } from "../../packages/ui/src/drift";

const start = (over: Partial<DriftNumbers> = {}): DriftNumbers => ({ x: 0, velocity: 0, drift: 0, push: 0, pushTarget: 0, ...over });
const run = (state: DriftNumbers, seconds: number, hz: number, target = 1) => {
  for (let i = 0; i < seconds * hz; i += 1) stepDrift(state, 1 / hz, 52, target);
  return state;
};

describe("the homepage row's movement (Decision 30)", () => {
  it("travels the same distance at 60Hz and 120Hz", () => {
    const options = { velocity: 1800, drift: 0.2, push: 100, pushTarget: 200 };
    const at60 = run(start(options), 3, 60);
    const at120 = run(start(options), 3, 120);
    expect(Math.abs(at60.x - at120.x)).toBeLessThan(1.5);
    expect(Math.abs(at60.drift - at120.drift)).toBeLessThan(1e-6);
  });

  it("momentum dies away smoothly, without reversing", () => {
    const state = start({ velocity: 1000 });
    let last = state.x;
    for (let i = 0; i < 240; i += 1) {
      stepDrift(state, 1 / 60, 0, 0);
      expect(state.x).toBeGreaterThanOrEqual(last);
      last = state.x;
    }
    expect(state.velocity).toBeLessThan(1);
  });

  it("eases into the drift in about 1.2s and out in about 0.6s", () => {
    expect(run(start(), 1.2, 60).drift).toBeGreaterThan(0.94);
    expect(run(start({ drift: 1 }), 0.6, 60, 0).drift).toBeLessThan(0.06);
  });

  it("caps the scroll push and a fling, in both directions", () => {
    expect(scalePush(100000)).toBe(PUSH_CAP);
    expect(scalePush(-100000)).toBe(-PUSH_CAP);
    expect(capFling(99999)).toBe(FLING_CAP);
  });

  it("stays still only when the cards are few, and repeats enough for any screen", () => {
    expect(shouldDrift(2)).toBe(false);
    expect(shouldDrift(3)).toBe(true);
    expect(roundsToFill(2400, 1440)).toBe(1);
    expect(roundsToFill(2400, 2560)).toBe(2);
    expect(roundsToFill(900, 2560)).toBe(3);
  });

  it("brings a card fully into view, and leaves one that already is", () => {
    expect(targetForCard(1, 900, 472, 432, 1440, 56)).toBe(472);
    expect(targetForCard(5, 0, 472, 432, 1440, 56)).toBeCloseTo(2360 - 896);
    expect(targetForCard(1, 300, 472, 432, 1440, 56)).toBe(300);
  });

  it("starts a glide from the nearest loop", () => {
    expect(nearestLoop(3700, 100, 3776, 10000)).toBe(-76);
    expect(nearestLoop(100, 3700, 3776, 10000)).toBe(3876);
    expect(nearestLoop(100, 3700, 3776, 3000)).toBe(100);
  });
});
