/**
 * Decision 25: each real item hides one sample of its kind, oldest sample first, and real work
 * always lists first. Nothing is deleted or rewritten, so the site and the Studio can both work
 * it out from the same content.
 */
export type SampleAware = { isSample?: boolean; _createdAt?: string };

export function visibleWithSamples<T extends SampleAware>(items: T[]): T[] {
  const real = items.filter((item) => !item.isSample);
  const samples = items.filter((item) => item.isSample);
  const keptSamples = samples
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) =>
        (a.item._createdAt ?? "").localeCompare(b.item._createdAt ?? "") || a.index - b.index,
    )
    .slice(real.length)
    .sort((a, b) => a.index - b.index)
    .map(({ item }) => item);
  return [...real, ...keptSamples];
}

export function samplesStillShowing<T extends SampleAware>(items: T[]): number {
  return visibleWithSamples(items).filter((item) => item.isSample).length;
}
