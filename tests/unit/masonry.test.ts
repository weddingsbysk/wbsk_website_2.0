import { describe, expect, it } from "vitest";
import { layoutMasonry, MASONRY_GAP, MASONRY_UNITS } from "../../packages/ui/src/masonry";

describe("masonry", () => {
  it("keeps Studio order by filling the shortest column, leftmost first", () => {
    const placed = layoutMasonry([1, 1, 1, 1.5, 0.5], 3);
    expect(placed.map((p) => p.column)).toEqual([1, 2, 3, 1, 2]);
  });

  it("never overlaps two photos in a column", () => {
    const ratios = Array.from({ length: 60 }, (_, i) => (i % 3 === 0 ? 1.5 : i % 3 === 1 ? 0.667 : 1.25));
    for (const columns of [2, 5]) {
      const ends = new Map<number, number>();
      for (const p of layoutMasonry(ratios, columns)) {
        expect(p.row).toBeGreaterThan(ends.get(p.column) ?? 0);
        ends.set(p.column, p.row + p.span - 1);
      }
    }
  });

  it("reserves each photo's exact shape plus the gap", () => {
    const [first] = layoutMasonry([1.5], 2);
    expect(first!.span).toBe(1.5 * MASONRY_UNITS + MASONRY_GAP);
  });
});
