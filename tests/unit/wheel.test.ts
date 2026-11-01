import { describe, expect, it } from "vitest";
import { createWheelClassifier } from "../../packages/ui/src/motion";

describe("Mouse wheel detection", () => {
  it("treats a large first step as a mouse", () => {
    expect(createWheelClassifier()({ deltaX: 0, deltaY: 100, deltaMode: 0 }, 0)).toBe(true);
  });
  it("treats line-based scrolling as a mouse", () => {
    expect(createWheelClassifier()({ deltaX: 0, deltaY: 3, deltaMode: 1 }, 0)).toBe(true);
  });
  it("leaves a trackpad alone, even when its flick grows large", () => {
    const classify = createWheelClassifier();
    expect(classify({ deltaX: 0, deltaY: 4, deltaMode: 0 }, 0)).toBe(false);
    expect(classify({ deltaX: 0, deltaY: 180, deltaMode: 0 }, 16)).toBe(false);
  });
  it("leaves sideways scrolling alone", () => {
    expect(createWheelClassifier()({ deltaX: 90, deltaY: 90, deltaMode: 0 }, 0)).toBe(false);
  });
});
