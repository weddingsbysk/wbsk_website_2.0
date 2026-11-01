import "@wbsk/ui/css/pages.css";
import { TitleWords } from "@wbsk/ui";
import type { Metadata } from "next";
import { getPrivacyPolicy } from "../../lib/content";

export const metadata: Metadata = { title: "Privacy" };

/** Used until a final policy is pasted into Site settings (Decision 16). */
const WORKING_POLICY = `What we collect: the names, contact details and wedding details you send through our forms, or the portfolio link and details you send when applying to work with us.

Why we collect them: only to reply to you, and to plan your wedding or shoot with you, or to consider your application.

Where they go: into a private Google Sheet and Gmail inbox that only our studio can open. We don't sell them or share them with anyone else.

How long we keep them: for as long as we need them to work with you, and we delete them when you ask.

Asking us to delete them: write to us at any time and we will.

Analytics: we only measure visits if you agree to it. Films play from YouTube only when you press play.`;

export default async function Page() {
  const policy = (await getPrivacyPolicy()) ?? WORKING_POLICY;
  return (
    <section className="wbsk-container wbsk-pagehead wbsk-prose">
      <p className="wbsk-label">Privacy</p>
      <h1 className="wbsk-h1">
        <TitleWords text="Your details, kept with care" />
      </h1>
      {policy.split(/\n{2,}/).map((paragraph) => (
        <p key={paragraph.slice(0, 30)} className="wbsk-measure">
          {paragraph}
        </p>
      ))}
    </section>
  );
}
