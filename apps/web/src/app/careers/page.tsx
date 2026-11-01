import type { Metadata } from "next";
import { PageIntro } from "../../components/PageIntro";

export const metadata: Metadata = { title: "Careers" };

export default function Page() {
  return (
    <PageIntro title="Careers" tone="light">
      Open roles and the application form arrive in later phases of the build.
    </PageIntro>
  );
}
