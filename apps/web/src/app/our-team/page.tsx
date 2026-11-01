import "@wbsk/ui/css/pages.css";
import { Reveal, TitleWords, WbskImage, WbskLink } from "@wbsk/ui";
import type { Metadata } from "next";
import { EnquireButton } from "../../components/EnquiryPanel";
import { getTeamPage, mainPageMetadata } from "../../lib/content";

export const generateMetadata = (): Promise<Metadata> => mainPageMetadata("teamPage", "Our team");

/** Past about eight people, the rest sit in a smaller row at the end (Decision 07). */
const CORE_CREW = 8;

export default async function Page() {
  const { line, members } = await getTeamPage();
  const [lead, ...crew] = members;
  const core = crew.slice(0, CORE_CREW - 1);
  const others = crew.slice(CORE_CREW - 1);
  return (
    <div data-tone="dark" className="wbsk-teampage">
      <section className="wbsk-container wbsk-pagehead">
        <p className="wbsk-label">Our team</p>
        <h1 className="wbsk-h1 wbsk-measure wbsk-teampage__line">
          <TitleWords text={line ?? "The people you'll forget are working."} />
        </h1>
      </section>
      {lead ? (
        <section className="wbsk-container wbsk-person" data-lead="true" data-side="right">
          <Reveal className="wbsk-person__text">
            <h2 className="wbsk-h1 wbsk-person__name">{lead.name}</h2>
            <p className="wbsk-label">{lead.role}</p>
            {lead.lines ? <p className="wbsk-lead">{lead.lines}</p> : null}
          </Reveal>
          <div className="wbsk-person__photo" data-glide="right">
            {lead.portrait ? <WbskImage image={lead.portrait} slot="card" sizes="(min-width: 900px) 46vw, 92vw" aspectRatio={4 / 5} /> : null}
          </div>
        </section>
      ) : null}
      {core.map((member, index) => {
        const side = index % 2 === 0 ? "left" : "right";
        return (
          <section key={member.name} className="wbsk-container wbsk-person" data-side={side}>
            <div className="wbsk-person__photo" data-glide={side}>
              {member.portrait ? <WbskImage image={member.portrait} slot="card" sizes="(min-width: 900px) 32vw, 92vw" aspectRatio={4 / 5} /> : null}
            </div>
            <Reveal className="wbsk-person__text">
              <h2 className="wbsk-h2 wbsk-person__name">{member.name}</h2>
              <p className="wbsk-label">{member.role}</p>
              {member.lines ? <p className="wbsk-person__lines">{member.lines}</p> : null}
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
          Want to join us?{" "}
          <WbskLink href="/careers/" className="wbsk-link wbsk-morelink">
            Careers →
          </WbskLink>
        </p>
        <div>
          <EnquireButton statement>Tell us about your wedding</EnquireButton>
        </div>
      </section>
    </div>
  );
}
