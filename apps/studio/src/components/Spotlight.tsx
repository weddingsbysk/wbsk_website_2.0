import { useEffect, useMemo, useRef, useState, type ComponentType, type KeyboardEvent } from "react";
import { BoxLine, ContentLine, FilmLine, FormLine, GearLine, GuideLine, HomeLine, MapLine, PhotosLine, PlayLine, QuoteLine, RecordLine, RingsLine, RoleLine, SearchLine, StarLine, TeamLine } from "./icons";
import { useClient, useRouter } from "./studio-hooks";

const OPEN_EVENT = "wbsk-open-spotlight";
export const openSpotlight = () => window.dispatchEvent(new Event(OPEN_EVENT));

type Result = {
  id: string;
  group: string;
  title: string;
  note?: string;
  icon?: ComponentType;
  image?: string;
  run: () => void;
};

type Found = { _id: string; _type: string; title?: string; image?: string; note?: string };

const KIND_NAMES: Record<string, string> = {
  wedding: "Wedding",
  film: "Film",
  destination: "Destination",
  preWeddingShoot: "Pre-wedding shoot",
  review: "Review",
  reactionVideo: "Reaction video",
  teamMember: "Team member",
  careerRole: "Open role",
  featuredOnItem: "Featured on",
  weddingPackage: "Package",
};

const KIND_ICONS: Record<string, ComponentType> = {
  wedding: RingsLine,
  film: FilmLine,
  destination: RecordLine,
  preWeddingShoot: MapLine,
  review: QuoteLine,
  reactionVideo: PlayLine,
  teamMember: TeamLine,
  careerRole: RoleLine,
  featuredOnItem: StarLine,
  weddingPackage: BoxLine,
};

const API = "2026-11-01";
const words = (text: string) => text.toLowerCase().split(/\s+/).filter(Boolean);

/** Press Cmd+K anywhere: type a task, a page or a couple's name, and go there. */
export function Spotlight() {
  const client = useClient({ apiVersion: API });
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [found, setFound] = useState<Found[]>([]);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const show = () => {
      returnTo.current = document.activeElement as HTMLElement | null;
      setTerm("");
      setFound([]);
      setActive(0);
      setOpen(true);
    };
    const keys = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        show();
      }
    };
    window.addEventListener(OPEN_EVENT, show);
    window.addEventListener("keydown", keys);
    return () => {
      window.removeEventListener(OPEN_EVENT, show);
      window.removeEventListener("keydown", keys);
    };
  }, []);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    returnTo.current?.focus?.();
  };

  useEffect(() => {
    const query = term.trim();
    if (!open || query.length < 2) return;
    let live = true;
    const timer = window.setTimeout(() => {
      void client
        .fetch<Found[]>(
          `*[_type in $kinds && !(_id in path("drafts.**")) && coalesce(name, names, title, firstName + " " + secondName, city) match $term][0...8]{
            _id, _type,
            "title": coalesce(name, names, title, firstName + " & " + secondName),
            "note": coalesce(city, role, kind),
            "image": coalesce(cardPhoto, portrait, poster, coverDesktop).asset->url
          }`,
          { kinds: Object.keys(KIND_NAMES), term: `${query}*` },
        )
        .then((result) => live && setFound(result));
    }, 140);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [term, open, client]);

  const results = useMemo<Result[]>(() => {
    const finish = (run: () => void) => () => {
      setOpen(false);
      run();
    };
    const add = (type: string) => finish(() => router.navigateIntent("create", { type }));
    const edit = (type: string, id: string) => finish(() => router.navigateIntent("edit", { id, type }));
    const section = (path: string) => finish(() => router.navigateUrl({ path: `/content/${path}` }));
    const tool = (name: string) => finish(() => router.navigate({ tool: name }));

    const actions: Result[] = [
      { id: "add-wedding", group: "Do something", title: "Add a wedding", icon: RingsLine, run: add("wedding") },
      { id: "add-film", group: "Do something", title: "Add a film", icon: FilmLine, run: add("film") },
      { id: "add-review", group: "Do something", title: "Add a review", icon: QuoteLine, run: add("review") },
      { id: "add-shoot", group: "Do something", title: "Add a pre-wedding shoot", icon: MapLine, run: add("preWeddingShoot") },
      { id: "add-role", group: "Do something", title: "Add an open role", icon: RoleLine, run: add("careerRole") },
      { id: "cover", group: "Do something", title: "Change a cover video", note: "Homepage", icon: PlayLine, run: edit("homepage", "homepage") },
      { id: "rating", group: "Do something", title: "Update the Google rating", note: "Site settings", icon: StarLine, run: edit("siteSettings", "siteSettings") },
      { id: "connect", group: "Do something", title: "Connect the enquiry forms", note: "Site settings", icon: FormLine, run: edit("siteSettings", "siteSettings") },
    ];
    const places: Result[] = [
      { id: "home", group: "Go to", title: "Home", icon: HomeLine, run: tool("home") },
      { id: "homepage", group: "Go to", title: "Homepage", icon: ContentLine, run: edit("homepage", "homepage") },
      { id: "weddings", group: "Go to", title: "Weddings", icon: RingsLine, run: section("weddings-section") },
      { id: "films", group: "Go to", title: "Films", icon: FilmLine, run: section("films-section") },
      { id: "prewedding", group: "Go to", title: "Pre-wedding", icon: RecordLine, run: section("prewedding-section") },
      { id: "team", group: "Go to", title: "Our team", icon: TeamLine, run: section("team-section") },
      { id: "careers", group: "Go to", title: "Careers", icon: RoleLine, run: section("careers-section") },
      { id: "reviews", group: "Go to", title: "Reviews", icon: QuoteLine, run: section("review") },
      { id: "reactions", group: "Go to", title: "Reaction videos", icon: PlayLine, run: section("reactionVideo") },
      { id: "forms", group: "Go to", title: "Enquiry forms", icon: FormLine, run: section("forms-section") },
      { id: "settings", group: "Go to", title: "Site settings", icon: GearLine, run: edit("siteSettings", "siteSettings") },
      { id: "photos", group: "Go to", title: "Photo library", icon: PhotosLine, run: tool("photos") },
      { id: "guide", group: "Go to", title: "Guide", icon: GuideLine, run: tool("guide") },
      { id: "tutorials", group: "Go to", title: "Tutorials", note: "Watch the short film", icon: PlayLine, run: tool("tutorials") },
    ];
    const typed = words(term);
    const fits = (item: Result) => typed.every((word) => `${item.title} ${item.note ?? ""}`.toLowerCase().includes(word));
    const documents = (term.trim().length < 2 ? [] : found).map<Result>((item) => ({
      id: item._id,
      group: "Found",
      title: item.title ?? "Untitled",
      note: [KIND_NAMES[item._type], item.note].filter(Boolean).join(" · "),
      icon: KIND_ICONS[item._type],
      image: item.image ? `${item.image}?w=90&h=108&fit=crop&auto=format` : undefined,
      run: edit(item._type, item._id),
    }));
    if (!typed.length) return [...actions.slice(0, 5), ...places.slice(0, 6)];
    return [...documents, ...actions.filter(fits), ...places.filter(fits)];
  }, [found, router, term]);

  // The list can shrink as results arrive, so the highlight never points past its end.
  const current = Math.min(active, Math.max(results.length - 1, 0));

  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [current]);

  if (!open) return null;

  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown" && results.length) {
      event.preventDefault();
      setActive((current + 1) % results.length);
    } else if (event.key === "ArrowUp" && results.length) {
      event.preventDefault();
      setActive((current - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      results[current]?.run();
    } else if (event.key === "Tab") {
      // Everything here is reached with the arrows, so focus stays in the field.
      event.preventDefault();
    }
  };

  return (
    <div className="st-spot" onPointerDown={(event) => event.target === event.currentTarget && close()}>
      <div className="st-spot__panel" role="dialog" aria-modal="true" aria-label="Search or jump to anything" onKeyDown={onKey}>
        <div className="st-spot__field">
          <SearchLine />
          <input
            ref={input}
            role="combobox"
            aria-expanded="true"
            aria-controls="st-spot-list"
            aria-activedescendant={results[current] ? `st-spot-${results[current].id}` : undefined}
            aria-autocomplete="list"
            placeholder="Add a wedding, a couple's name, a page…"
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
              setActive(0);
            }}
          />
        </div>
        {results.length ? (
          <ul ref={list} id="st-spot-list" className="st-spot__list" role="listbox" aria-label="Results">
            {results.map((item, index) => {
              const Icon = item.icon;
              return (
                <li key={`${item.group}-${item.id}`} role="presentation">
                  {index === 0 || results[index - 1]!.group !== item.group ? <div className="st-spot__group" role="presentation">{item.group}</div> : null}
                  <div id={`st-spot-${item.id}`} className="st-spot__item" role="option" aria-selected={index === current} onPointerMove={() => setActive(index)} onClick={item.run}>
                    {item.image ? (
                      <img src={item.image} alt="" />
                    ) : (
                      <span className="st-row__mark">{Icon ? <Icon /> : null}</span>
                    )}
                    <span>
                      {item.title}
                      {item.note ? <small>{item.note}</small> : null}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="st-spot__none" role="status">Nothing found for &ldquo;{term}&rdquo;. Try a couple&rsquo;s first name or a page.</p>
        )}
        <div className="st-spot__foot" aria-hidden="true">
          <span><kbd>↑↓</kbd> move</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
