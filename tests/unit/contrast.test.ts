import { describe, expect, it } from "vitest";
import { colors } from "../../packages/ui/src/tokens";

const luminance = (hex: string) => {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

describe("Colour pairs meet 4.5:1 (Decisions 02, 29)", () => {
  it.each([
    ["ink on ivory", colors.ink, colors.ivory],
    ["deep gold on ivory", colors.deepGold, colors.ivory],
    ["gold on dusk", colors.gold, colors.dusk],
    ["ivory on dusk", colors.ivory, colors.dusk],
    ["ivory on deep gold", colors.ivory, colors.deepGold],
    ["dusk on gold", colors.dusk, colors.gold],
    ["error on ivory", colors.error, colors.ivory],
  ])("%s", (_name, a, b) => {
    expect(contrast(a, b)).toBeGreaterThanOrEqual(4.5);
  });
  it("bright gold stays off light pages as text", () => {
    expect(contrast(colors.gold, colors.ivory)).toBeLessThan(4.5);
  });
});
