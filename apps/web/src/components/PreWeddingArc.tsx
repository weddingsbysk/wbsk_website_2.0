"use client";

import { RecordArc, type ArcDestination } from "@wbsk/ui/record-arc";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useSyncExternalStore } from "react";

const never = () => () => {};
const readSearch = () => window.location.search;
const noSearch = () => "";

export function PreWeddingArc({
  destinations,
  allSamples,
}: {
  destinations: ArcDestination[];
  allSamples: boolean;
}) {
  const router = useRouter();
  const search = useSyncExternalStore(never, readSearch, noSearch);
  // G8: while everything is a sample, ?records=1, 2, 3 or 5 shows the arc with that many, so a
  // launch with few destinations can be checked on a real phone. Remove in P10.
  const shown = useMemo(() => {
    const count = Number(new URLSearchParams(search).get("records"));
    return allSamples && count >= 1 ? destinations.slice(0, count) : destinations;
  }, [allSamples, destinations, search]);
  const navigate = useCallback((href: string) => router.push(href), [router]);
  return <RecordArc destinations={shown} navigate={navigate} />;
}
