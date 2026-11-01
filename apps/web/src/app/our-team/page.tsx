import type { Metadata } from "next";
import { PageIntro } from "../../components/PageIntro";

export const metadata: Metadata = { title: "Our team" };

export default function Page() {
  return (
    <PageIntro title="Our team" tone="dark">
      The team page arrives in a later phase of the build.
    </PageIntro>
  );
}
