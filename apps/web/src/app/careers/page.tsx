import "@wbsk/ui/css/pages.css";
import { Reveal, TitleWords } from "@wbsk/ui";
import type { Metadata } from "next";
import { EnquiryForm } from "../../components/EnquiryForm";
import { getCareersPage, mainPageMetadata } from "../../lib/content";

export const generateMetadata = (): Promise<Metadata> => mainPageMetadata("careersPage", "Careers");

export default async function Page() {
  const { intro, roles, form } = await getCareersPage();
  return (
    <>
      <section className="wbsk-container wbsk-pagehead">
        <p className="wbsk-label">Careers</p>
        <h1 className="wbsk-h1 wbsk-measure">
          <TitleWords text={intro ?? "If you notice the small things at a big wedding, come and talk to us."} />
        </h1>
      </section>
      <section className="wbsk-container wbsk-roles" aria-label="Open roles">
        <p className="wbsk-label">Open roles</p>
        {roles.length ? (
          <ul>
            {roles.map((role, index) => (
              <li key={role.title}>
                <Reveal delayIndex={index}>
                  <h2 className="wbsk-h2">{role.title}</h2>
                  {role.description ? <p className="wbsk-lead wbsk-measure">{role.description}</p> : null}
                </Reveal>
              </li>
            ))}
          </ul>
        ) : (
          <p className="wbsk-lead">No open roles right now, but we&rsquo;d still like to see your work.</p>
        )}
      </section>
      <section className="wbsk-section wbsk-container">
        <EnquiryForm config={form} roles={roles.map((role) => role.title)} />
      </section>
    </>
  );
}
