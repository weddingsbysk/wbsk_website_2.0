import type { Metadata } from "next";
import { PageIntro } from "../../components/PageIntro";

export const metadata: Metadata = { title: "Films" };

export default function Page() {
  return (
    <PageIntro title="Films" tone="dark">
      The screening room arrives in a later phase of the build.
    </PageIntro>
  );
}
