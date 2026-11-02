import "@wbsk/ui/css/home.css";
import { CoverVideo, HeroDrift, Letterbox, Reveal, TitleWords, WbskImage, WbskLink } from "@wbsk/ui";
import { EnquiryForm } from "../components/EnquiryForm";
import { FeaturedRow } from "../components/DriftRow";
import { Counter, FilmStack, ReactionRow, ReviewsLoop } from "../components/HomeSections";
import { OpeningIntro } from "../components/OpeningIntro";
import { getHomepageContent, mainPageMetadata } from "../lib/content";

export const generateMetadata = () => mainPageMetadata("homepage", "Weddings By Siddhant Kapoor");

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

      <section className="wbsk-section wbsk-container wbsk-who">
        <Reveal>
          <p className="wbsk-label">Who we are</p>
          <h2 className="wbsk-h1 wbsk-who__story">{home.whoWeAre}</h2>
        </Reveal>
        {home.counters.length ? (
          <Reveal delayIndex={1} className="wbsk-who__counters">
            {home.counters.map((counter) => (
              <Counter key={counter.label} value={counter.value} label={counter.label} />
            ))}
          </Reveal>
        ) : null}
      </section>

      {home.weddings.length ? (
        <section className="wbsk-homesection wbsk-homesection--flush" aria-label="Featured weddings">
          <div className="wbsk-container">
            <Reveal>
              <p className="wbsk-label wbsk-homesection__label">Recent weddings</p>
            </Reveal>
          </div>
          <FeaturedRow weddings={home.weddings} seeAllHref="/weddings/" />
        </section>
      ) : null}

      {home.films.length ? (
        <section data-tone="dark" className="wbsk-section" aria-label="Featured films">
          <div className="wbsk-container">
            <Reveal>
              <p className="wbsk-label wbsk-homesection__label">On film</p>
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
          <h2 className="wbsk-h2">{home.teamLine ?? "The people behind your story"}</h2>
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
                  <p className="wbsk-label wbsk-homesection__label">What our couples say</p>
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
                  <p className="wbsk-label wbsk-homesection__label">Watch them react</p>
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
              <p className="wbsk-label wbsk-homesection__label">Featured on</p>
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
