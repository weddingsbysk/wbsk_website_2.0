import "@wbsk/ui/css/home.css";
import { CoverVideo, HeroDrift, Letterbox, Reveal, SectionHead, TitleWords, WbskImage, WbskLink } from "@wbsk/ui";
import { EnquiryForm } from "../components/EnquiryForm";
import { FeaturedRow } from "../components/DriftRow";
import { Counter, FilmStack, ReactionRow, ReviewsLoop } from "../components/HomeSections";
import { OpeningIntro } from "../components/OpeningIntro";
import { getHomepageContent, mainPageMetadata } from "../lib/content";

export const generateMetadata = () => mainPageMetadata("homepage", "Weddings By Siddhant Kapoor");

/** Sets the one chosen word of the quote in gold italic. */
function emphasised(quote: string, word?: string) {
  const at = word ? quote.indexOf(word) : -1;
  if (!word || at < 0) return quote;
  return (
    <>
      {quote.slice(0, at)}
      <em>{word}</em>
      {quote.slice(at + word.length)}
    </>
  );
}

export default async function HomePage() {
  const home = await getHomepageContent();
  return (
    <>
      <OpeningIntro />
      <section id="hero" data-tone="dark" className="wbsk-hero">
        <div className="wbsk-hero__media">
          <CoverVideo desktop={home.videoDesktop} phone={home.videoPhone} posterDesktop={home.posterDesktop} posterPhone={home.posterPhone} label="the WBSK film" />
        </div>
        <HeroDrift />
        <div className="wbsk-hero__text wbsk-container">
          <h1 className="wbsk-display wbsk-measure">
            <TitleWords text={home.heroLine ?? "Weddings By Siddhant Kapoor"} />
          </h1>
        </div>
      </section>

      <section data-tone="dark" className="wbsk-philosophy" aria-labelledby="philosophy-quote">
        <div className="wbsk-container">
          <Reveal>
            <p className="wbsk-label">Our perspective</p>
            <h2 id="philosophy-quote" className="wbsk-philosophy__quote">
              &ldquo;{emphasised(home.whoWeAre ?? "", home.quoteEmphasis)}&rdquo;
            </h2>
            {home.quoteBy ? <p className="wbsk-philosophy__by">{home.quoteBy}</p> : null}
          </Reveal>
          {home.counters.length ? (
            <Reveal delayIndex={1} className="wbsk-philosophy__counters">
              {home.counters.map((counter) => (
                <Counter key={counter.label} value={counter.value} label={counter.label} />
              ))}
            </Reveal>
          ) : null}
        </div>
      </section>

      {home.weddings.length ? (
        <section className="wbsk-homesection wbsk-homesection--flush" aria-label="Featured weddings">
          <div className="wbsk-container">
            <Reveal>
              <SectionHead line={home.weddingsLine}>Recent Weddings</SectionHead>
            </Reveal>
          </div>
          <FeaturedRow weddings={home.weddings} seeAllHref="/weddings/" />
        </section>
      ) : null}

      {home.films.length ? (
        <section data-tone="dark" className="wbsk-section" aria-label="Featured films">
          <div className="wbsk-container">
            <Reveal>
              <SectionHead>Our Featured Films</SectionHead>
            </Reveal>
            <FilmStack films={home.films} />
          </div>
        </section>
      ) : null}

      <section className="wbsk-section wbsk-container" aria-label="The team">
        {home.teamPhoto ? (
          <Letterbox>
            <WbskImage image={home.teamPhoto} slot="coverDesktop" sizes="(min-width: 1680px) 1570px, 100vw" aspectRatio={21 / 9} parallax />
          </Letterbox>
        ) : null}
        <Reveal className="wbsk-teamline">
          <SectionHead>{home.teamLine ?? "The people behind your story"}</SectionHead>
          <WbskLink href="/our-team/" className="wbsk-link wbsk-morelink">
            Meet the people →
          </WbskLink>
        </Reveal>
      </section>

      {home.reviews.length || home.reactions.length ? (
        <section className="wbsk-homesection" aria-label="What our couples say">
          <div className="wbsk-container">
            {home.reviews.length ? (
              <>
                <Reveal>
                  <SectionHead>What Our Couples Say</SectionHead>
                </Reveal>
                <ReviewsLoop reviews={home.reviews} />
              </>
            ) : null}
            {home.google ? (
              <a className="wbsk-link wbsk-googleline" href={home.google.href} target="_blank" rel="noopener noreferrer">
                {home.google.rating} on Google · {home.google.count} reviews ↗
                <span className="wbsk-sr"> (opens in a new tab)</span>
              </a>
            ) : null}
            {home.reactions.length ? (
              <div className="wbsk-reactions">
                <Reveal>
                  <SectionHead>Watch Them React</SectionHead>
                </Reveal>
                <ReactionRow reactions={home.reactions} />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {home.featuredOn.length ? (
        <section className="wbsk-homesection" aria-label="Featured on">
          <div className="wbsk-container">
            <Reveal>
              <SectionHead>Featured On</SectionHead>
            </Reveal>
            <ul className="wbsk-featuredon">
              {home.featuredOn.map((item) => (
                <li key={item.name}>
                  <a href={item.link} target="_blank" rel="noopener noreferrer" aria-label={`${item.name} (opens in a new tab)`}>
                    {item.image ? <WbskImage image={item.image} slot="card" sizes="(min-width: 760px) 30vw, 92vw" aspectRatio={3 / 2} /> : null}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section id="enquire" className="wbsk-section wbsk-container wbsk-enquiry">
        {home.packages.length ? (
          <Reveal>
            <ul className="wbsk-packages">
              {home.packages.map((item) => (
                <li key={item.name}>
                  <strong>{item.name}</strong>
                  <span>{item.line}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        ) : null}
        <EnquiryForm config={home.form} />
      </section>
    </>
  );
}
