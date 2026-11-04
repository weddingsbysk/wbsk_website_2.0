import { describe, expect, it } from "vitest";
import {
  addressFromNames,
  describeRule,
  imageRules,
  imageSizeFromRef,
  isInstagramLink,
  isYouTubeLink,
  meetsSize,
  samplesStillShowing,
  tooSmallMessage,
  visibleWithSamples,
  youTubeId,
} from "../../packages/content/src";

const sample = (id: number, day: number) => ({ id: `s${id}`, isSample: true, _createdAt: `2026-11-0${day}` });
const real = (id: string) => ({ id, isSample: false, _createdAt: "2026-12-01" });

describe("Samples fade out as real work arrives (Decision 25)", () => {
  const samples = [sample(1, 1), sample(2, 2), sample(3, 3)];
  it("shows all samples when nothing is real", () => {
    expect(visibleWithSamples(samples).map((i) => i.id)).toEqual(["s1", "s2", "s3"]);
  });
  it("hides the oldest sample per real item, and lists real work first", () => {
    expect(visibleWithSamples([...samples, real("r1")]).map((i) => i.id)).toEqual(["r1", "s2", "s3"]);
  });
  it("hides every sample once real items match them", () => {
    expect(visibleWithSamples([...samples, real("a"), real("b"), real("c")]).map((i) => i.id)).toEqual(["a", "b", "c"]);
  });
  it("counts what's still showing", () => {
    expect(samplesStillShowing([...samples, real("a")])).toBe(2);
  });
  it("copes with more real items than samples", () => {
    expect(samplesStillShowing([sample(1, 1), real("a"), real("b")])).toBe(0);
  });
});

describe("Upload size rules (Decision 06)", () => {
  it("reads an image's size from its reference", () => {
    expect(imageSizeFromRef("image-abc123-3000x2000-jpg")).toEqual({ width: 3000, height: 2000 });
    expect(imageSizeFromRef(undefined)).toBeNull();
  });
  it.each([
    ["card", { width: 1600, height: 2000 }, true],
    ["card", { width: 1599, height: 2000 }, false],
    ["coverDesktop", { width: 2560, height: 1097 }, true],
    ["coverDesktop", { width: 1920, height: 823 }, false],
    ["coverPhone", { width: 1500, height: 1999 }, false],
    ["gallery", { width: 1700, height: 2560 }, true],
    ["gallery", { width: 2000, height: 1500 }, false],
    ["poster", { width: 1920, height: 1080 }, true],
    ["destinationArt", { width: 1600, height: 1600 }, true],
  ] as const)("%s at %o: %s", (slot, size, ok) => {
    expect(meetsSize(size, imageRules[slot])).toBe(ok);
  });
  it("uses the friendly refusal wording", () => {
    expect(tooSmallMessage("cover", imageRules.coverDesktop, { width: 1920, height: 823 })).toBe(
      "This photo is too small for the cover. Please upload one at least 2560px wide. Yours was 1920 × 823.",
    );
    expect(describeRule(imageRules.gallery)).toBe("2560px on its long edge");
  });
});

describe("Links and addresses", () => {
  it("recognises YouTube links", () => {
    expect(isYouTubeLink("https://youtu.be/Uu6J7jDswug")).toBe(true);
    expect(isYouTubeLink("https://www.youtube.com/watch?v=Uu6J7jDswug")).toBe(true);
    expect(isYouTubeLink("https://vimeo.com/123456")).toBe(false);
    expect(youTubeId("https://youtu.be/Uu6J7jDswug?si=x")).toBe("Uu6J7jDswug");
  });
  it("recognises Instagram reels", () => {
    expect(isInstagramLink("https://www.instagram.com/reel/AbC123/")).toBe(true);
    expect(isInstagramLink("https://example.com/reel/AbC123/")).toBe(false);
  });
  it("makes addresses in the current pattern", () => {
    expect(addressFromNames("Anusha", "Rohit")).toBe("anusha-rohit");
    expect(addressFromNames("Zoë M.", "Rohit Kumar")).toBe("zoe-m-rohit-kumar");
  });
});
