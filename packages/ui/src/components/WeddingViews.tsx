import type { CSSProperties, ReactNode } from "react";
import type { WbskImageSource } from "../image";
import { WbskLink } from "../link-context";
import { WbskImage } from "./WbskImage";

export type WeddingSummary = {
  slug: string;
  href: string;
  first: string;
  second: string;
  /** Shown in capitals, e.g. "DESTINATION · GOA". */
  place: string;
  placeLabel: string;
  city: string;
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

/**
 * Editorial Caption: a clean 4:5 photo with everything written below it (Decision 05). A copy in the
 * homepage's moving row is the same card, hidden from keyboards and screen readers (Decision 30).
 */
export function ClientCard({
  wedding,
  onShow,
  sizes,
  copy,
}: {
  wedding: WeddingSummary;
  onShow?: (text: string) => void;
  sizes: string;
  copy?: boolean;
}) {
  const show = onShow ? () => onShow(wedding.shortDescription) : undefined;
  return (
    <article className="wbsk-card" data-slug={copy ? undefined : wedding.slug}>
      <WbskLink
        href={wedding.href}
        className="wbsk-card__link"
        data-transition="expand"
        aria-label={`${wedding.first} & ${wedding.second}, ${wedding.placeLabel} · ${wedding.city}, ${wedding.venue} · ${wedding.monthYear}: view story`}
        tabIndex={copy ? -1 : undefined}
        onMouseEnter={show}
        onFocus={show}
      >
        <span className="wbsk-card__photo">
          <span className="wbsk-card__clip" data-expand="">
            {wedding.cardPhoto ? <WbskImage image={wedding.cardPhoto} slot="card" sizes={sizes} aspectRatio={4 / 5} /> : null}
          </span>
        </span>
        <span className="wbsk-card__caption">
          {/* The names come first for screen readers and voice control; styles put the place above them. */}
          <span className="wbsk-card__names" role="heading" aria-level={2}>
            <CoupleNames first={wedding.first} second={wedding.second} />
          </span>{" "}
          <span className="wbsk-label wbsk-card__place">{wedding.place}</span>{" "}
          <span className="wbsk-card__metaline">
            <span className="wbsk-card__meta">
              {wedding.venue}&nbsp;· <span className="wbsk-nowrap">{wedding.monthYear}</span>
            </span>{" "}
            <span className="wbsk-card__more" aria-hidden="true">
              <span className="wbsk-card__moreword">
                View story
                <span className="wbsk-card__rule" />
              </span>
              <span className="wbsk-card__arrow" />
            </span>
          </span>
        </span>
      </WbskLink>
      {copy ? null : <p className="wbsk-card__description">{wedding.shortDescription}</p>}
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
          {meta ? <p className="wbsk-card__meta">{meta}</p> : null}
        </div>
      </div>
    </section>
  );
}
