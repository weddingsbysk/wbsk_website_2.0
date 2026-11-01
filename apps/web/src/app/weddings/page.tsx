import type { Metadata } from "next";
import { PageIntro } from "../../components/PageIntro";

export const metadata: Metadata = { title: "Weddings" };

export default function Page() {
  return (
    <PageIntro title="Weddings" tone="light">
      Wedding stories arrive in a later phase of the build.
    </PageIntro>
  );
}
