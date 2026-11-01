import type { Metadata } from "next";
import { PageIntro } from "../../components/PageIntro";

export const metadata: Metadata = { title: "Privacy" };

export default function Page() {
  return (
    <PageIntro title="Privacy" tone="light">
      The privacy policy is written and approved before launch.
    </PageIntro>
  );
}
