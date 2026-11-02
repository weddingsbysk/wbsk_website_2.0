import "@wbsk/ui/css/pages.css";
import { GlideIn, Reveal, TitleWords, WbskImage, WbskLink, SectionHead } from "@wbsk/ui";
import type { Metadata } from "next";
import { EnquireButton } from "../../components/EnquiryPanel";
import { getTeamPage, mainPageMetadata } from "../../lib/content";

export const generateMetadata = (): Promise<Metadata> => mainPageMetadata("teamPage", "Our team");

/** Past about eight people, the rest sit in a smaller row at the end (Decision 07). */
const CORE_CREW = 8;

export default async function Page() {
  const { line, joinLine, closingLine, members } = await getTeamPage();
  const [lead, ...crew] = members;
  const core = crew.slice(0, CORE_CREW - 1);
  const others = crew.slice(CORE_CREW - 1);
  return (
    <div data-tone="dark" className="wbsk-teampage">
      <section className="wbsk-container wbsk-pagehead">
        <div data-depth="48">
          <SectionHead as="h1" line={line ?? "The people you'll forget are working."}>
            <TitleWords text="Our Team" />
          </SectionHead>
        </div>
      </section>
      {lead ? (
        <section className="wbsk-container wbsk-person" data-lead="true" data-side="right">
          <Reveal className="wbsk-person__text">
            <div data-depth="26">
              <h2 className="wbsk-h1 wbsk-person__name">{lead.name}</h2>
              <p className="wbsk-label">{lead.role}</p>
              {lead.lines ? <p className="wbsk-lead">{lead.lines}</p> : null}
            </div>
          </Reveal>
          <GlideIn side="right">
            <div data-depth="90">
              {lead.portrait ? <WbskImage image={lead.portrait} slot="card" sizes="(min-width: 900px) 46vw, 92vw" aspectRatio={4 / 5} parallax /> : null}
            </div>
          </GlideIn>
        </section>
      ) : null}
      {core.map((member, index) => {
        const side = index % 2 === 0 ? "left" : "right";
        return (
          <section key={member.name} className="wbsk-container wbsk-person" data-side={side}>
            <GlideIn side={side}>
              <div data-depth={index % 2 === 0 ? 70 : 110}>
                {member.portrait ? <WbskImage image={member.portrait} slot="card" sizes="(min-width: 900px) 32vw, 92vw" aspectRatio={4 / 5} parallax /> : null}
              </div>
            </GlideIn>
            <Reveal className="wbsk-person__text">
              <div data-depth="24">
                <h2 className="wbsk-h2 wbsk-person__name">{member.name}</h2>
                <p className="wbsk-label">{member.role}</p>
                {member.lines ? <p className="wbsk-person__lines">{member.lines}</p> : null}
              </div>
            </Reveal>
          </section>
        );
      })}
      {others.length ? (
        <ul className="wbsk-container wbsk-crewrow">
          {others.map((member) => (
            <li key={member.name}>
              {member.portrait ? <WbskImage image={member.portrait} slot="card" sizes="(min-width: 900px) 18vw, 45vw" aspectRatio={4 / 5} /> : null}
              <h2 className="wbsk-h3 wbsk-person__name">{member.name}</h2>
              <p className="wbsk-label">{member.role}</p>
            </li>
          ))}
        </ul>
      ) : null}
      <section className="wbsk-container wbsk-closingband">
        <p className="wbsk-lead">
          {joinLine ?? "Want to join us?"}{" "}
          <WbskLink href="/careers/" className="wbsk-link wbsk-morelink">
            Careers →
          </WbskLink>
        </p>
        <div>
          <EnquireButton statement>{closingLine ?? "Tell us about your wedding"}</EnquireButton>
        </div>
      </section>
    </div>
  );
}
