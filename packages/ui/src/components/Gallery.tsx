import type { CSSProperties } from "react";
import { buildSrcSet, fullscreenWidths, sanityUrl, tinyPreviewUrl, type SanityImage } from "../image";
import { layoutMasonry } from "../masonry";

export const GALLERY_COLUMNS = { wide: 5, narrow: 2 };

/**
 * Rendered on the server with no per-photo script. Each photo is a real link to its large version,
 * and one small script (GalleryLightbox) reads these links when a photo is opened.
 */
export function Gallery({ photos }: { photos: SanityImage[] }) {
  const ratios = photos.map((photo) => photo.height / photo.width);
  const wide = layoutMasonry(ratios, GALLERY_COLUMNS.wide);
  const narrow = layoutMasonry(ratios, GALLERY_COLUMNS.narrow);
  return (
    <ul className="wbsk-gallery">
      {photos.map((photo, index) => {
        const widths = fullscreenWidths(photo.width, photo.height);
        const href = sanityUrl(photo, { width: widths[Math.min(1, widths.length - 1)]! });
        const style = {
          "--c5": wide[index]!.column,
          "--r5": wide[index]!.row,
          "--s5": wide[index]!.span,
          "--c2": narrow[index]!.column,
          "--r2": narrow[index]!.row,
          "--s2": narrow[index]!.span,
        } as CSSProperties;
        return (
          <li key={photo.url} style={style}>
            <a
              href={href}
              className="wbsk-gallery__photo"
              data-photo
            >
              {/* A tiny separate image, not data inside the page: 60 of those would slow it down. */}
              <img
                className="wbsk-gallery__blur"
                src={tinyPreviewUrl(photo.url)}
                alt=""
                loading="lazy"
                decoding="async"
              />
              <img
                className="wbsk-gallery__sharp"
                src={sanityUrl(photo, { width: 450 })}
                srcSet={buildSrcSet(photo, "thumbnail")}
                sizes="(min-width: 1024px) 20vw, 50vw"
                alt={photo.alt}
                loading="lazy"
                decoding="async"
              />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
