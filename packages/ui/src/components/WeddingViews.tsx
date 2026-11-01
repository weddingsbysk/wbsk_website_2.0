import type { CSSProperties, ReactNode } from "react";
import type { WbskImageSource } from "../image";
import { WbskLink } from "../link-context";
import { WbskImage } from "./WbskImage";

export type WeddingSummary = {
  slug: string;
  href: string;
  first: string;
  second: string;
  place: string;
  venue: string;
  monthYear: string;
  shortDescription: string;
  cardPhoto: WbskImageSource | null;
};

export function CoupleNames({ first, second }: { first: string; second: string }) {
  return (
    <>
      {first} <span className="wbsk-amp">&amp;</span> {second}
    </>
  );
}

/** Editorial Caption: a clean 4:5 photo, with everything written below it (Decision 05). */
export function ClientCard({ wedding, onShow }: { wedding: WeddingSummary; onShow?: (text: string) => void }) {
  const show = onShow ? () => onShow(wedding.shortDescription) : undefined;
  return (
    <article className="wbsk-card" data-slug={wedding.slug}>
      <WbskLink
        href={wedding.href}
        className="wbsk-card__link"
        data-transition="expand"
        onMouseEnter={show}
        onFocus={show}
      >
        <span className="wbsk-card__photo">
          {wedding.cardPhoto ? (
            <WbskImage
              image={wedding.cardPhoto}
              slot="card"
              sizes="(min-width: 1024px) 31vw, (min-width: 700px) 47vw, 92vw"
              aspectRatio={4 / 5}
            />
          ) : null}
          {/* Clean at rest; on hover, cinema bars close in and carry the invitation (Decision 05). */}
          <span className="wbsk-card__bar" data-edge="top" aria-hidden="true" />
          <span className="wbsk-card__bar" data-edge="bottom" aria-hidden="true" />
          <span className="wbsk-card__more" aria-hidden="true">
            View story →
          </span>
        </span>
        <span className="wbsk-card__caption">
          <span className="wbsk-label wbsk-card__place">{wedding.place}</span>
          <span className="wbsk-h3 wbsk-card__names" role="heading" aria-level={2}>
            <CoupleNames first={wedding.first} second={wedding.second} />
          </span>
          <span className="wbsk-card__meta">
            {wedding.venue} · {wedding.monthYear}
          </span>
        </span>
      </WbskLink>
      <p className="wbsk-card__description">{wedding.shortDescription}</p>
    </article>
  );
}

/** The cover with its ivory Floating Label, half on the photo, half on the page (Decision 06). */
/** A page title that arrives word by word out of a mask, like a film's (owner, 2 November 2026). */
export function TitleWords({ text }: { text: string }) {
  return (
    <>
      {text.split(" ").map((word, index) => (
        <span key={`${word}-${index}`}>
          <span className="wbsk-title__word">
            <span style={{ "--word": index } as CSSProperties}>{word}</span>
          </span>{" "}
        </span>
      ))}
    </>
  );
}

export function StoryCover({
  cover,
  coverPhone,
  place,
  names,
  meta,
}: {
  cover: WbskImageSource | null;
  coverPhone: WbskImageSource | null;
  place: string;
  names: ReactNode;
  meta: string;
}) {
  return (
    <section id="hero" className="wbsk-storycover">
      {cover ? (
        <WbskImage image={cover} portraitImage={coverPhone ?? undefined} slot="coverDesktop" sizes="100vw" aspectRatio={21 / 9} priority parallax />
      ) : (
        <div className="wbsk-frame" />
      )}
      <div className="wbsk-container wbsk-storycover__labelwrap">
        <div className="wbsk-storycover__label">
          <p className="wbsk-label">{place}</p>
          <h1 className="wbsk-h1">{names}</h1>
          <p className="wbsk-card__meta">{meta}</p>
        </div>
      </div>
    </section>
  );
}
