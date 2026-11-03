"use client";

import { memo, type CSSProperties } from "react";
import { WbskLink } from "../link-context";
import { WbskImage } from "./WbskImage";
import type { WeddingSummary } from "./WeddingViews";

/** The cover's photograph runs the album's full height beside the names. It's exported at 3:7. */
const COVER_RATIO = 3 / 7;
const COVER_SIZES = "(min-width: 1528px) 136px, (min-width: 700px) 8.9vw, 25vw";
const PAGE_SIZES = "(min-width: 1528px) 240px, (min-width: 700px) 15.6vw, 38vw";

/** The second name steps right by this much of the type size. Matches album.css. */
const NAME_STEP = 0.5;

/** A first name for the cover: "Sample" and any long surname stay inside on the album's pages. */
function coverName(name: string) {
  const bare = name.replace(/^Sample /, "");
  return bare.length <= 12 ? bare : (bare.split(" ")[0] ?? bare);
}

/** Roughly how wide a name runs in these capitals, as a share of the type size, so nothing needs measuring. */
const capsWidth = (name: string) =>
  [...name.toUpperCase()].reduce((sum, letter) => {
    if ("IJ '-.".includes(letter)) return sum + 0.44;
    if (letter === "M") return sum + 0.98;
    if (letter === "W") return sum + 1.04;
    return sum + ("EFLPSTBZ".includes(letter) ? 0.66 : 0.78);
  }, 0);

/**
 * A wedding as a real album (owner, 3 November 2026): smooth white cover, photograph to the edge, the
 * couple's names in large thin capitals. It opens to two pages, bride on the left, groom on the right.
 * Without scripts it's a closed album and a plain link. A copy in the moving row is the same album,
 * hidden from keyboards and screen readers (Decision 30).
 */
export const AlbumCard = memo(function AlbumCard({
  wedding,
  label,
  photos,
  copy,
}: {
  wedding: WeddingSummary;
  /** The small line on the cover; a sample always says so (Decision 25). */
  label: string;
  /** The pages' photographs are only asked for once the album has been opened. */
  photos: boolean;
  copy?: boolean;
}) {
  const coverPhoto = wedding.albumCover ?? wedding.cardPhoto;
  const first = coverName(wedding.first);
  const second = coverName(wedding.second);
  // Long names get smaller together, so the two always match and stay on the paper.
  const size = Math.min(0.118, 0.34 / Math.max(capsWidth(first), capsWidth(second) + NAME_STEP));
  const [labelFirst, ...labelRest] = (wedding.isSample ? "Sample wedding" : label).split(" ");
  return (
    <article className="wbsk-album" data-slug={copy ? undefined : wedding.slug}>
      <WbskLink
        href={wedding.href}
        className="wbsk-album__link"
        data-transition="expand"
        tabIndex={copy ? -1 : undefined}
        draggable={false}
      >
        {/* What the album says is written here in full; everything on it is for the eye. */}
        <span className="wbsk-sr">
          <span role="heading" aria-level={2}>
            {wedding.first} &amp; {wedding.second}
          </span>
          {`, ${wedding.placeLabel} · ${wedding.city}, ${wedding.storyTitle ? `${wedding.storyTitle}, ` : ""}${wedding.monthYear}, ${wedding.venue}, ${wedding.city}: view story`}
        </span>
        <span className="wbsk-album__swell" aria-hidden="true">
          <span className="wbsk-album__stage">
            <span className="wbsk-album__frame" data-expand="">
              <span className="wbsk-album__body">
                <span className="wbsk-album__ribbon">
                  <span className="wbsk-album__link-piece">
                    <span className="wbsk-album__link-piece">
                      <span className="wbsk-album__link-piece">
                        <span className="wbsk-album__link-piece wbsk-album__link-piece--tail" />
                      </span>
                    </span>
                  </span>
                </span>
                <span className="wbsk-album__3d">
                  <i className="wbsk-album__back wbsk-album__back--left" />
                  <i className="wbsk-album__back" />
                  <i className="wbsk-album__edge wbsk-album__edge--bottom wbsk-album__edge--bottom-left" />
                  <i className="wbsk-album__spine" />
                  <i className="wbsk-album__edge wbsk-album__edge--right" />
                  <i className="wbsk-album__edge wbsk-album__edge--bottom" />
                  <span className="wbsk-album__page wbsk-album__page--right">
                    <span className="wbsk-album__print">
                      {photos && wedding.groomPhoto ? <WbskImage image={wedding.groomPhoto} slot="card" sizes={PAGE_SIZES} aspectRatio={4 / 5} /> : null}
                    </span>
                    <span className="wbsk-album__who">
                      <span>{wedding.second}</span>
                      <b>Groom</b>
                    </span>
                    <i className="wbsk-album__cast" />
                  </span>
                  <span className="wbsk-album__hinge">
                    <span className="wbsk-album__cover">
                      <span className="wbsk-album__front">
                        <span className="wbsk-album__photo">
                          {coverPhoto ? <WbskImage image={coverPhoto} slot="thumbnail" sizes={COVER_SIZES} aspectRatio={COVER_RATIO} /> : null}
                          <i className="wbsk-album__photo-edge" />
                        </span>
                        <span className="wbsk-album__type">
                          <span className="wbsk-album__label">
                            {labelFirst}
                            {labelRest.length ? <br /> : null}
                            {labelRest.join(" ")}
                          </span>
                          <span className="wbsk-album__names" style={{ "--size": `${size.toFixed(4)}em` } as CSSProperties}>
                            <span>{first}</span> <span>{second}</span>
                          </span>
                          <span className="wbsk-album__when">
                            {wedding.city}
                            <br />
                            {wedding.monthYear}
                          </span>
                          <span className="wbsk-album__mark">
                            W<b>B</b>SK
                          </span>
                        </span>
                        <i className="wbsk-album__glare" />
                        <i className="wbsk-album__shade" />
                      </span>
                      <i className="wbsk-album__board-edge" />
                      <span className="wbsk-album__inner">
                        <span className="wbsk-album__page wbsk-album__page--left">
                          <span className="wbsk-album__print">
                            {photos && wedding.bridePhoto ? <WbskImage image={wedding.bridePhoto} slot="card" sizes={PAGE_SIZES} aspectRatio={4 / 5} /> : null}
                          </span>
                          <span className="wbsk-album__who">
                            <span>{wedding.first}</span>
                            <b>Bride</b>
                          </span>
                        </span>
                        <i className="wbsk-album__shade" />
                      </span>
                    </span>
                  </span>
                </span>
              </span>
            </span>
          </span>
        </span>
      </WbskLink>
    </article>
  );
});
