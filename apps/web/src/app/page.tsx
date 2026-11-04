import "@wbsk/ui/css/home.css";
import { Fragment } from "react";
import { CoverVideo, HeroDrift, Letterbox, Reveal, SectionHead, TitleWords, WbskImage, WbskLink } from "@wbsk/ui";
import { EnquiryForm } from "../components/EnquiryForm";
import { FeaturedRow } from "../components/DriftRow";
import { FirstVisitGuide } from "../components/FirstVisitGuide";
import { Counter, FilmStack, ReviewsLoop } from "../components/HomeSections";
import { IntroMark, IntroName } from "../components/IntroLogo";
import { OpeningIntro } from "../components/OpeningIntro";
import { getHomepageContent, mainPageMetadata } from "../lib/content";

export const generateMetadata = () => mainPageMetadata("homepage", "Weddings By Siddhant Kapoor");

/** The quote as separate words, which light up in turn with the scroll; one chosen word is gold italic. */
function quoteWords(quote: string, word?: string) {
  return quote.split(" ").map((part, index) => {
    const bare = part.replace(/[^\p{L}\p{N}'’-]/gu, "");
    return (
      <span key={`${part}-${index}`} className="wbsk-lit">
        {word && bare === word ? <em>{part}</em> : part}{" "}
      </span>
    );
  });
}

/** The line beside the form; one chosen word is gold italic. */
function emphasised(line: string, word: string) {
  return line.split(" ").map((part, index) => (
    <Fragment key={`${part}-${index}`}>
      {index ? " " : null}
      {part.replace(/[^\p{L}\p{N}'’-]/gu, "") === word ? <em>{part}</em> : part}
    </Fragment>
  ));
}

/** A soft pool of light behind a scene, drifting at its own pace as the page scrolls, for quiet depth. */
function Lamp({ place, light }: { place: "left" | "centre" | "right"; light?: boolean }) {
  return (
    <div className="wbsk-lampwrap" aria-hidden="true">
      <div className="wbsk-lamp" data-depth="90" data-place={place} data-light={light || undefined} />
    </div>
  );
}

const TICKER = ["Weddings", "Films", "Candid moments", "Haldi ceremonies", "Portraits", "Destinations", "Pre-weddings"];
/** Enough words that the strip outruns any screen as it slides, however few the Studio lists. */
const TICKER_LENGTH = 21;

export default async function HomePage() {
  const home = await getHomepageContent();
  const ticker = home.tickerWords?.length ? home.tickerWords : TICKER;
  return (
    <>
      <OpeningIntro name={<IntroName />} mark={<IntroMark />} />
      <FirstVisitGuide place="home" />
      <section id="hero" data-tone="dark" className="wbsk-hero">
        <div className="wbsk-hero__media">
          <CoverVideo desktop={home.videoDesktop} phone={home.videoPhone} posterDesktop={home.posterDesktop} posterPhone={home.posterPhone} label="the WBSK film" />
        </div>
        <HeroDrift />
        <span className="wbsk-hero__cue" aria-hidden="true" />
        <div className="wbsk-hero__text wbsk-container">
          <p className="wbsk-hero__eyebrow">{home.heroEyebrow ?? "Photography · Films · Events"}</p>
          <h1 className="wbsk-display wbsk-measure">
            <TitleWords text={home.heroLine ?? "Weddings By Siddhant Kapoor"} />
          </h1>
        </div>
      </section>

      <section data-tone="dark" className="wbsk-philosophy" aria-labelledby="philosophy-quote">
        <Lamp place="left" />
        <div className="wbsk-ticker" aria-hidden="true">
          <p>
            {Array.from({ length: Math.ceil(TICKER_LENGTH / ticker.length) }, () => ticker).flat().map((word, index) => (
              <span key={`${word}-${index}`}>{word}</span>
            ))}
          </p>
        </div>
        <div className="wbsk-container">
          <Reveal>
            <p className="wbsk-label">Our perspective</p>
            <h2 id="philosophy-quote" className="wbsk-philosophy__quote">
              {quoteWords(`“${home.whoWeAre ?? ""}”`, home.quoteEmphasis)}
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
          <FeaturedRow weddings={home.weddings} seeAllHref="/weddings/" albumLabel={home.albumLabel} />
        </section>
      ) : null}

      {home.films.length ? (
        <section data-tone="dark" className="wbsk-section" aria-label="Featured films">
          <Lamp place="centre" />
          <div className="wbsk-container">
            <Reveal>
              <SectionHead>Our Featured Films</SectionHead>
            </Reveal>
            <FilmStack films={home.films} />
          </div>
        </section>
      ) : null}

      <section className="wbsk-container wbsk-teamblock" aria-label="The team">
        {home.teamPhoto ? (
          <Letterbox>
            <WbskImage image={home.teamPhoto} slot="coverDesktop" sizes="(min-width: 900px) 56vw, 100vw" aspectRatio={21 / 9} parallax />
          </Letterbox>
        ) : null}
        <Reveal className="wbsk-teamblock__text">
          <p className="wbsk-label">Our team</p>
          <h2 className="wbsk-h2">{home.teamLine ?? "The people behind your story"}</h2>
          <WbskLink href="/our-team/" className="wbsk-link wbsk-morelink">
            Meet the people →
          </WbskLink>
        </Reveal>
      </section>

      {home.reviews.length ? (
        <section className="wbsk-homesection" aria-label="What our couples say">
          <Lamp place="right" light />
          <div className="wbsk-container">
            <Reveal>
              <SectionHead>What Our Couples Say</SectionHead>
            </Reveal>
            <ReviewsLoop reviews={home.reviews} />
            {home.google ? (
              <a className="wbsk-link wbsk-googleline" href={home.google.href} target="_blank" rel="noopener noreferrer">
                {home.google.rating} on Google · {home.google.count} reviews ↗
                <span className="wbsk-sr"> (opens in a new tab)</span>
              </a>
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
        <div className="wbsk-enquiry__aside">
          <Reveal>
            <p className="wbsk-label">Get in touch</p>
            <h2 className="wbsk-enquiry__title">
              {emphasised(home.enquiryTitle ?? "Let’s create something beautiful together", home.enquiryEmphasis ?? "beautiful")}
            </h2>
          </Reveal>
          {home.packages.length ? (
            <Reveal delayIndex={1}>
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
        </div>
        <EnquiryForm config={home.form} />
      </section>
    </>
  );
}
