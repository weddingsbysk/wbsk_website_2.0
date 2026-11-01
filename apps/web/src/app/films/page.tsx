import "@wbsk/ui/css/pages.css";
import { TitleWords } from "@wbsk/ui";
import type { Metadata } from "next";
import { EnquireButton } from "../../components/EnquiryPanel";
import { FilmsList } from "../../components/FilmsList";
import { getFilmsPage } from "../../lib/content";

export const metadata: Metadata = { title: "Films" };

export default async function Page() {
  const { intro, films } = await getFilmsPage();
  return (
    <div data-tone="dark" className="wbsk-filmspage">
      <section className="wbsk-container wbsk-pagehead">
        <h1 className="wbsk-h1">
          <TitleWords text="Films" />
        </h1>
        {intro ? <p className="wbsk-lead wbsk-measure">{intro}</p> : null}
      </section>
      <FilmsList films={films} />
      <section className="wbsk-container wbsk-closingband">
        <p className="wbsk-lead">Want a film like this?</p>
        <div>
          <EnquireButton statement>Tell us about your wedding</EnquireButton>
        </div>
      </section>
    </div>
  );
}
