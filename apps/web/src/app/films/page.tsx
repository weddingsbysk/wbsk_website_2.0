import "@wbsk/ui/css/pages.css";
import { SectionHead, TitleWords } from "@wbsk/ui";
import type { Metadata } from "next";
import { EnquireButton } from "../../components/EnquiryPanel";
import { FilmsList } from "../../components/FilmsList";
import { getFilmsPage, mainPageMetadata } from "../../lib/content";

export const generateMetadata = (): Promise<Metadata> => mainPageMetadata("filmsPage", "Films");

export default async function Page() {
  const { intro, closingLead, closingLine, films } = await getFilmsPage();
  return (
    <div data-tone="dark" className="wbsk-filmspage">
      <section className="wbsk-container wbsk-pagehead">
        <SectionHead as="h1" line={intro}>
          <TitleWords text="Films" />
        </SectionHead>
      </section>
      <FilmsList films={films} />
      <section className="wbsk-container wbsk-closingband">
        <p className="wbsk-lead">{closingLead ?? "Want a film like this?"}</p>
        <div>
          <EnquireButton statement>{closingLine ?? "Tell us about your wedding"}</EnquireButton>
        </div>
      </section>
    </div>
  );
}
