import type { Metadata } from "next";
import { PageIntro } from "../../components/PageIntro";

export const metadata: Metadata = { title: "Pre-wedding" };

export default function Page() {
  return (
    <PageIntro title="Pre-wedding" tone="dark">
      The record arc and destinations arrive in later phases of the build.
    </PageIntro>
  );
}
