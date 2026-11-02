import { sanityProject } from "@wbsk/content";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { set, useClient, useDocumentOperation, useFormValue, type ObjectInputProps, type StringInputProps } from "sanity";

const note: CSSProperties = { fontSize: 13, lineHeight: 1.5, color: "#6B5E50" };

type ImageValue = { asset?: { _ref?: string }; hotspot?: { x: number; y: number } };

function assetUrl(ref?: string) {
  const match = ref?.match(/^image-([^-]+)-(\d+x\d+)-([a-z0-9]+)$/);
  if (!match) return null;
  const [, id, size, format] = match;
  return `https://cdn.sanity.io/images/${sanityProject.projectId}/${sanityProject.dataset}/${id}-${size}.${format}`;
}

/**
 * Shows how a cover crops with its focal point, with a pale band where the ivory name label sits,
 * so faces stay clear of it (Decision 18).
 */
function CoverFraming(ratio: string, width: number, band: CSSProperties) {
  return function CoverInput(props: ObjectInputProps) {
    const value = props.value as ImageValue | undefined;
    const url = assetUrl(value?.asset?._ref);
    return (
      <div style={{ display: "grid", gap: 12 }}>
        {props.renderDefault(props)}
        {url ? (
          <div>
            <p style={{ ...note, margin: "0 0 6px" }}>How it crops on the website. Keep faces above the band.</p>
            <div style={{ position: "relative", width, maxWidth: "100%", aspectRatio: ratio, overflow: "hidden", borderRadius: 8 }}>
              <img
                src={`${url}?w=${width * 2}&auto=format`}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: `${(value?.hotspot?.x ?? 0.5) * 100}% ${(value?.hotspot?.y ?? 0.5) * 100}%`,
                }}
              />
              <div style={{ position: "absolute", display: "grid", placeItems: "center", background: "rgb(245 239 230 / 0.72)", borderRadius: 4, fontSize: 11, color: "#231C16", ...band }}>Name label</div>
            </div>
          </div>
        ) : null}
      </div>
    );
  };
}

export const DesktopCoverInput = CoverFraming("21 / 9", 420, { left: "3%", bottom: 0, width: "42%", height: "22%" });
export const PhoneCoverInput = CoverFraming("3 / 4", 200, { left: "4%", right: "4%", bottom: 0, height: "16%" });

const PAGE_NAMES: Record<string, string> = {
  homepage: "Weddings By Siddhant Kapoor",
  weddingsPage: "Weddings",
  filmsPage: "Films",
  preWeddingPage: "Pre-wedding",
  teamPage: "Our team",
  careersPage: "Careers",
};

const COUNT_TITLE = 60;
const COUNT_DESCRIPTION = 155;

/** A small preview of the Google result, with gentle character counts that never block (Decision 21). */
export function SeoInput(props: ObjectInputProps) {
  const value = props.value as { title?: string; description?: string } | undefined;
  const firstName = useFormValue(["firstName"]) as string | undefined;
  const secondName = useFormValue(["secondName"]) as string | undefined;
  const name = useFormValue(["name"]) as string | undefined;
  const short = useFormValue(["shortDescription"]) as string | undefined;
  const place = useFormValue(["placeLabel"]) as string | undefined;
  const venue = useFormValue(["venue"]) as string | undefined;
  const city = useFormValue(["city"]) as string | undefined;
  const pageType = useFormValue(["_type"]) as string | undefined;
  // The same automatic titles the website writes (Decision 21).
  const fallbackTitle = firstName
    ? `${firstName} & ${secondName ?? ""} — ${place === "Destination" ? "Destination wedding" : "Wedding"} at ${venue ?? ""}, ${city ?? ""} | WBSK`
    : name
      ? `${name} pre-wedding films and photos | WBSK`
      : `${PAGE_NAMES[pageType ?? ""] ?? "WBSK"} | WBSK`;
  const title = value?.title || fallbackTitle;
  const description = value?.description || short || "Wedding films and photographs by Weddings By Siddhant Kapoor.";
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ padding: 14, borderRadius: 8, background: "#FFFDF9", border: "1px solid rgb(35 28 22 / 0.12)" }}>
        <p style={{ margin: "0 0 4px", fontSize: 12, color: "#4d5156" }}>wbsk.in</p>
        <p style={{ margin: "0 0 4px", fontSize: 18, color: "#1a0dab", lineHeight: 1.3 }}>{title}</p>
        <p style={{ margin: 0, fontSize: 13, color: "#4d5156", lineHeight: 1.45 }}>{description}</p>
      </div>
      <p style={{ ...note, margin: 0 }}>
        Search title: {(value?.title ?? "").length} of about {COUNT_TITLE}. Search description: {(value?.description ?? "").length} of about {COUNT_DESCRIPTION}. Leave empty for the automatic ones.
      </p>
      {props.renderDefault(props)}
    </div>
  );
}

/**
 * Real destinations count from WBSK-PW 001, from a stored counter, so a number is never reused
 * even if a destination is deleted (Decision 09, G7). The number is taken once a name is typed:
 * Sanity also works out starting values just to check permissions, so doing it there would use up
 * a number, and rebuild the website, every time a list opened.
 */
export function CatalogueInput(props: StringInputProps) {
  const client = useClient({ apiVersion: "2026-11-01" });
  const name = useFormValue(["name"]) as string | undefined;
  const { onChange, value } = props;
  const taken = useRef(false);

  useEffect(() => {
    if (value || !name?.trim() || taken.current) return;
    taken.current = true;
    void client
      .patch("siteSettings")
      .setIfMissing({ catalogueCounter: 0 })
      .inc({ catalogueCounter: 1 })
      .commit<{ catalogueCounter: number }>()
      .then((settings) => onChange(set(`WBSK-PW ${String(settings.catalogueCounter).padStart(3, "0")}`)));
  }, [client, name, onChange, value]);

  return props.renderDefault(props);
}

type Source = { label: string; url: string; poster: unknown; names: string; place?: string; linked?: string };

/** G10: "Use a film from this wedding or shoot", so nothing is typed twice. Stores nothing itself. */
export function FilmFromSourceInput(props: StringInputProps) {
  const client = useClient({ apiVersion: "2026-11-01" });
  const id = String(useFormValue(["_id"]) ?? "").replace(/^drafts\./, "");
  const { patch } = useDocumentOperation(id, "film");
  const [sources, setSources] = useState<Source[]>([]);
  const [done, setDone] = useState("");

  useEffect(() => {
    let live = true;
    void client
      .fetch<{ weddings: { _id: string; a?: string; b?: string; city?: string; teaser?: { url?: string; poster?: unknown }; highlight?: { url?: string; poster?: unknown } }[]; shoots: { names?: string; films?: { url?: string; poster?: unknown }[] }[] }>(
        `{
          "weddings": *[_type == "wedding" && !(_id in path("drafts.**"))]{_id, "a": firstName, "b": secondName, city, teaser, highlight},
          "shoots": *[_type == "preWeddingShoot" && !(_id in path("drafts.**"))]{names, films}
        }`,
      )
      .then((data) => {
        if (!live) return;
        const list: Source[] = [];
        for (const wedding of data.weddings) {
          const names = `${wedding.a} & ${wedding.b}`;
          if (wedding.highlight?.url) list.push({ label: `${names}: highlight`, url: wedding.highlight.url, poster: wedding.highlight.poster, names, place: wedding.city, linked: wedding._id });
          if (wedding.teaser?.url) list.push({ label: `${names}: teaser`, url: wedding.teaser.url, poster: wedding.teaser.poster, names, place: wedding.city, linked: wedding._id });
        }
        for (const shoot of data.shoots) {
          for (const film of shoot.films ?? []) {
            if (film.url) list.push({ label: `${shoot.names}: pre-wedding film`, url: film.url, poster: film.poster, names: shoot.names ?? "" });
          }
        }
        setSources(list);
      });
    return () => {
      live = false;
    };
  }, [client]);

  const use = useCallback(
    (index: string) => {
      const source = sources[Number(index)];
      if (!source) return;
      patch.execute([
        {
          set: {
            url: source.url,
            poster: source.poster,
            names: source.names,
            ...(source.place ? { place: source.place } : {}),
            ...(source.linked ? { linked: { _type: "reference", _ref: source.linked } } : {}),
          },
        },
      ]);
      setDone(`Filled in from ${source.label}. Add the type and a one-line description.`);
    },
    [patch, sources],
  );

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <select
        aria-label="Use a film from this wedding or shoot"
        defaultValue=""
        onChange={(event) => use(event.target.value)}
        style={{ font: "inherit", minHeight: 44, padding: "8px 10px", borderRadius: 8, border: "1px solid rgb(35 28 22 / 0.3)", background: "#FFFDF9" }}
      >
        <option value="" disabled>
          Choose a wedding or shoot film…
        </option>
        {sources.map((source, index) => (
          <option key={`${source.label}-${index}`} value={index}>
            {source.label}
          </option>
        ))}
      </select>
      {done ? <p style={{ ...note, margin: 0 }} role="status">{done}</p> : null}
    </div>
  );
}
