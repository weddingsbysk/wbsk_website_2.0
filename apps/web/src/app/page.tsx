import { ArrowIcon, Reveal, WbskImage, WbskLink } from "@wbsk/ui";
import { getHomepage } from "../lib/content";
import { publicAsset } from "../lib/site";

const fallback = (name: string, width: number, height: number) => ({
  kind: "local" as const,
  url: publicAsset(`/sample/${name}.jpg`),
  width,
  height,
  alt: "",
});

export default async function HomePage() {
  const home = await getHomepage();
  return (
    <>
      <section id="hero" data-tone="dark" className="wbsk-hero">
        <WbskImage
          image={home.posterDesktop ?? fallback("hero-desktop", 2560, 1440)}
          portraitImage={home.posterPhone ?? fallback("hero-phone", 1350, 2400)}
          slot="poster"
          sizes="100vw"
          priority
        />
        <div className="wbsk-hero__text wbsk-container">
          <h1 className="wbsk-display wbsk-measure">{home.heroLine ?? "Weddings By Siddhant Kapoor"}</h1>
        </div>
      </section>

      {home.whoWeAre ? (
        <section className="wbsk-section">
          <div className="wbsk-container">
            <Reveal>
              <h2 className="wbsk-h1 wbsk-measure">{home.whoWeAre}</h2>
            </Reveal>
          </div>
        </section>
      ) : null}

      <section data-tone="dark" className="wbsk-section">
        <div className="wbsk-container">
          <Reveal>
            <h2 className="wbsk-h2">{home.teamLine ?? "The people behind your story"}</h2>
          </Reveal>
          <Reveal delayIndex={1} className="mt-12">
            <WbskImage
              image={home.teamPhoto ?? fallback("team-wide", 3000, 1286)}
              slot="coverDesktop"
              sizes="(min-width: 1440px) 1360px, 100vw"
              aspectRatio={21 / 9}
              parallax
            />
          </Reveal>
        </div>
      </section>

      <section id="enquire" className="wbsk-section">
        <div className="wbsk-container">
          <Reveal>
            <h2 className="wbsk-h2">Tell us about your wedding</h2>
            <p className="wbsk-lead wbsk-measure mt-6 mb-10">
              The enquiry form arrives in a later phase. Until then, this section marks where it sits.
            </p>
            <WbskLink href="/weddings/" className="wbsk-button">
              <span>See the weddings page</span>
              <ArrowIcon />
            </WbskLink>
          </Reveal>
        </div>
      </section>
    </>
  );
}
