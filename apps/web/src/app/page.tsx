import { ArrowIcon, Reveal, WbskImage, WbskLink } from "@wbsk/ui";
import { publicAsset } from "../lib/site";

const poster = (name: string, width: number, height: number, alt: string) => ({
  kind: "local" as const,
  url: publicAsset(`/sample/${name}.jpg`),
  width,
  height,
  alt,
});

export default function HomePage() {
  return (
    <>
      <section id="hero" data-tone="dark" className="wbsk-hero">
        <WbskImage
          image={poster("hero-desktop", 2560, 1440, "Sample tone standing in for the hero film")}
          portraitImage={poster(
            "hero-phone",
            1350,
            2400,
            "Sample tone standing in for the hero film",
          )}
          slot="poster"
          sizes="100vw"
          priority
        />
        <div className="wbsk-hero__text wbsk-container">
          <h1 className="wbsk-display wbsk-measure">Sample hero line</h1>
        </div>
      </section>

      <section className="wbsk-section">
        <div className="wbsk-container">
          <Reveal>
            <h2 className="wbsk-h1 wbsk-measure">
              Who we are goes here. This text is a sample, and the real words are written in the
              Studio.
            </h2>
          </Reveal>
        </div>
      </section>

      <section data-tone="dark" className="wbsk-section">
        <div className="wbsk-container">
          <Reveal>
            <h2 className="wbsk-h2">Films open a dusk chapter</h2>
          </Reveal>
          <Reveal delayIndex={1} className="mt-12">
            <WbskImage
              image={poster(
                "team-wide",
                3000,
                1286,
                "Sample tone standing in for a wide photograph",
              )}
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
              The enquiry form arrives in a later phase. Until then, this section marks where it
              sits.
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
