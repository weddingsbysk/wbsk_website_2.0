export type MasonryPlacement = { column: number; row: number; span: number };

/** Row tracks per column width; a photo's span is its height in these units. */
export const MASONRY_UNITS = 100;
/** The gap between photos, in the same units, so it scales with the columns. */
export const MASONRY_GAP = 6;

/**
 * Places photos in Studio order, each in the currently shortest column (leftmost on a tie), so the
 * page reads left to right rather than column by column (Decision 06). Pure arithmetic, so the
 * server can do it and every photo's space is reserved before it loads.
 */
export function layoutMasonry(heightOverWidth: number[], columns: number): MasonryPlacement[] {
  const heights = new Array<number>(columns).fill(0);
  return heightOverWidth.map((ratio) => {
    let column = 0;
    for (let c = 1; c < columns; c += 1) if (heights[c]! < heights[column]!) column = c;
    const span = Math.round(ratio * MASONRY_UNITS) + MASONRY_GAP;
    const placement = { column: column + 1, row: heights[column]! + 1, span };
    heights[column]! += span;
    return placement;
  });
}
