import "@wbsk/ui/css/home.css";
import "@wbsk/ui/css/pages.css";
import { SectionHead, TitleWords } from "@wbsk/ui";
import type { Metadata } from "next";
import { EnquiryForm } from "../../components/EnquiryForm";
import { FilmsList } from "../../components/FilmsList";
import { FirstVisitGuide } from "../../components/FirstVisitGuide";
import { getFilmsPage, mainPageMetadata } from "../../lib/content";

export const generateMetadata = (): Promise<Metadata> => mainPageMetadata("filmsPage", "Films");

export default async function Page() {
  const { intro, closingLead, films, form, packages } = await getFilmsPage();
  return (
    <>
      <FirstVisitGuide place="films" />
      <div data-tone="dark" className="wbsk-filmspage">
        <section className="wbsk-container wbsk-pagehead">
          <SectionHead as="h1" line={intro}>
            <TitleWords text="Films" />
          </SectionHead>
        </section>
        <FilmsList films={films} />
      </div>
      {/* The enquiry follows the films straight away, in a light scene of its own. */}
      <section className="wbsk-section wbsk-container wbsk-enquiry" aria-label="Tell us about your wedding">
        <div className="wbsk-enquiry__aside">
          <h2 className="wbsk-enquiry__title">{closingLead ?? "Want a film like this?"}</h2>
          {packages.length ? (
            <ul className="wbsk-packages">
              {packages.map((item) => (
                <li key={item.name}>
                  <strong>{item.name}</strong>
                  <span>{item.line}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <EnquiryForm config={form} />
      </section>
    </>
  );
}
