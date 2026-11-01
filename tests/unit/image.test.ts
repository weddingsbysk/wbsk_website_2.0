import { describe, expect, it } from "vitest";
import { buildSrcSet, sanityUrl, type WbskImageSource } from "../../packages/ui/src/image";

const image: Extract<WbskImageSource, { kind: "sanity" }> = {
  kind: "sanity",
  url: "https://cdn.sanity.io/images/p/d/abc-3000x2000.jpg",
  width: 3000,
  height: 2000,
  alt: "Sample",
  focal: { x: 0.25, y: 0.75 },
};

describe("Sanity image addresses", () => {
  it("asks for modern formats automatically", () => {
    expect(sanityUrl(image, { width: 600 })).toContain("auto=format");
  });
  it("crops around the focal point", () => {
    const url = sanityUrl(image, { width: 800, height: 1000 });
    expect(url).toContain("crop=focalpoint");
    expect(url).toContain("fp-x=0.250");
    expect(url).toContain("fp-y=0.750");
  });
  it("uses the Decision 06 full-screen sizes", () => {
    expect(buildSrcSet(image, "fullscreen")).toMatch(/1600w.*2048w.*2560w/);
  });
  it("never asks for more pixels than the upload has", () => {
    const small = { ...image, width: 1800, height: 1200 };
    expect(buildSrcSet(small, "fullscreen")).not.toContain("2048w");
    const tiny = { ...image, width: 1000, height: 800 };
    expect(buildSrcSet(tiny, "fullscreen")).toContain("1000w");
  });
});
