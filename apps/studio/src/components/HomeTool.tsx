import { samplesStillShowing } from "@wbsk/content";
import { useEffect, useRef, useState, type ComponentType, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { MANAGER_NAME, SITE_ADDRESS } from "../brand";
import { minutesAgo, useWebsiteStatus } from "../tools/useWebsiteStatus";
import { AlertLine, CheckLine, FilmLine, FormLine, GearLine, LeafLine, MapLine, PenLine, PlayLine, QuoteLine, RecordLine, RingsLine, RoleLine, SearchLine, StarLine, TextLine } from "./icons";
import { openSpotlight } from "./Spotlight";
import { useClient, useRouter } from "./studio-hooks";

const API = "2026-11-01";
const SAMPLE_KINDS = ["wedding", "destination", "preWeddingShoot", "film", "review", "reactionVideo", "teamMember", "careerRole", "featuredOnItem"];

const quick: [string, string, string | null, ComponentType][] = [
  ["Add a wedding", "Names, six photos, gallery, films. Step by step.", "wedding", RingsLine],
  ["Add a film", "YouTube link and poster, for the homepage or Films page.", "film", FilmLine],
  ["Add a review", "Paste a couple's words, add stars, approve.", "review", QuoteLine],
  ["Add a pre-wedding shoot", "Pick its destination; its page fills itself.", "preWeddingShoot", MapLine],
  ["Change a cover video", "Homepage or Pre-wedding. Desktop, phone and two posters.", null, PlayLine],
  ["Update open roles", "Roles shown on Careers and in its form.", "careerRole", RoleLine],
];

type Row = { id: string; type: string; title: string; note: string; icon: ComponentType };
type Note = { text: string; intent?: [string, string]; icon: ComponentType };

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

/** A slow-turning record, the website's own motif. It turns faster while the website updates, and stops if an update failed. */
function Record({ state }: { state: string }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const watch = new IntersectionObserver(([entry]) => element.style.setProperty("--st-play", entry?.isIntersecting ? "running" : "paused"));
    watch.observe(element);
    return () => watch.disconnect();
  }, []);
  return (
    <div ref={root} className="st-record" data-state={state} aria-hidden="true">
      <div className="st-record__label">
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="50" fill="#DDAF3A" />
          <circle cx="50" cy="50" r="46" fill="none" stroke="#1F1914" strokeOpacity="0.35" strokeWidth="0.6" />
          <defs>
            <path id="st-label-arc" d="M50 50m-34 0a34 34 0 1 1 68 0a34 34 0 1 1-68 0" />
          </defs>
          <text fill="#1F1914" fontFamily="Outfit, sans-serif" fontSize="7.4" letterSpacing="2.5">
            <textPath href="#st-label-arc">WEDDINGS BY SIDDHANT KAPOOR · STUDIO ·</textPath>
          </text>
          <circle cx="50" cy="50" r="5" fill="#15100C" />
        </svg>
      </div>
    </div>
  );
}

function Block({ title, index, children }: { title: string; index: number; children: ReactNode }) {
  return (
    <section className="st-panel st-rise" style={{ "--i": index } as CSSProperties}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Skeleton() {
  return (
    <div role="status" aria-label="Loading">
      <div className="st-skeleton" style={{ width: "72%" }} />
      <div className="st-skeleton" style={{ width: "54%" }} />
    </div>
  );
}

/** The light on a card follows the cursor. */
function followCursor(event: PointerEvent<HTMLElement>) {
  const box = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty("--mx", `${event.clientX - box.left}px`);
  event.currentTarget.style.setProperty("--my", `${event.clientY - box.top}px`);
}

export function HomeTool() {
  const website = useWebsiteStatus();
  const client = useClient({ apiVersion: API });
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [waiting, setWaiting] = useState<Row[]>([]);
  const [worth, setWorth] = useState<Note[]>([]);
  const [last, setLast] = useState<{ title: string; at: string; href: string; image?: string } | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      const data = await client.fetch<{
        drafts: { _id: string; _type: string; title?: string }[];
        unapproved: { _id: string; names?: string }[];
        empty: { _id: string; name?: string }[];
        items: { _type: string; _createdAt: string; isSample?: boolean }[];
        settings: { googleUpdated?: string; backupWhatsApp?: string; backupEmail?: string; publishLinkExpires?: string; formEndpoint?: string } | null;
        missing: { n: number; id: string }[];
        last: { title?: string; _updatedAt: string; _type?: string; slug?: string; image?: string } | null;
      }>(
        `{
          "drafts": *[_id in path("drafts.**") && _type in ["wedding","destination","preWeddingShoot","film"]]{_id,_type,"title":coalesce(name,names,firstName+" & "+secondName)}[0...6],
          "unapproved": *[_type=="review" && approved!=true]{_id,names}[0...6],
          "empty": *[_type=="destination" && !(_id in path("drafts.**")) && count(*[_type=="preWeddingShoot" && references(^._id) && hidden!=true && !(_id in path("drafts.**"))])==0]{_id,name}[0...6],
          "items": *[_type in $kinds && !(_id in path("drafts.**")) && hidden!=true]{_type,_createdAt,isSample},
          "settings": *[_id=="siteSettings"][0]{googleUpdated,backupWhatsApp,backupEmail,publishLinkExpires,formEndpoint},
          "missing": *[_type=="wedding" && count(gallery[!defined(description)]) > 0]{"n":count(gallery[!defined(description)]),"id":_id},
          "last": *[_type in $kinds && !(_id in path("drafts.**"))]|order(_updatedAt desc)[0]{_type,"slug":address.current,_updatedAt,"title":coalesce(name,names,title,firstName+" & "+secondName),"image":coalesce(cardPhoto,portrait,poster,coverDesktop).asset->url}
        }`,
        { kinds: SAMPLE_KINDS },
      );
      if (!live) return;
      setWaiting([
        ...data.drafts.map((d) => ({ id: d._id.replace(/^drafts\./, ""), type: d._type, title: d.title ?? `New ${d._type === "wedding" ? "wedding" : "item"}, no name yet`, note: "Draft · open it to see what's left", icon: PenLine })),
        ...data.unapproved.map((r) => ({ id: r._id.replace(/^drafts\./, ""), type: "review", title: `Review from ${r.names ?? "a couple"}`, note: "Needs approval", icon: QuoteLine })),
        ...data.empty.map((d) => ({ id: d._id, type: "destination", title: d.name ?? "Destination", note: "Shows on the records once it has a shoot", icon: RecordLine })),
      ]);
      const notes: Note[] = [];
      const settings: [string, string] = ["siteSettings", "siteSettings"];
      const updated = data.settings?.googleUpdated;
      if (!updated || Date.now() - new Date(updated).getTime() > 60 * 86400000) notes.push({ text: updated ? "Google rating not updated for 60+ days" : "Google rating not filled in", intent: settings, icon: StarLine });
      if (!data.settings?.backupWhatsApp) notes.push({ text: "Backup WhatsApp number is empty", intent: settings, icon: GearLine });
      if (!data.settings?.backupEmail) notes.push({ text: "Backup email is empty", intent: settings, icon: GearLine });
      const expires = data.settings?.publishLinkExpires;
      if (expires && new Date(expires).getTime() - Date.now() < 30 * 86400000) notes.push({ text: "The Publish link expires within a month. Ask Siddhant to renew it.", intent: settings, icon: AlertLine });
      if (!data.settings?.formEndpoint) notes.push({ text: "The forms aren't connected to the Sheet yet", intent: settings, icon: FormLine });
      const missing = data.missing.reduce((sum, item) => sum + item.n, 0);
      if (missing) notes.push({ text: `${missing} gallery ${missing === 1 ? "photo has" : "photos have"} no description`, intent: ["wedding", data.missing[0]!.id.replace(/^drafts\./, "")], icon: TextLine });
      const showing = SAMPLE_KINDS.reduce((sum, kind) => sum + samplesStillShowing(data.items.filter((i) => i._type === kind)), 0);
      if (showing) notes.push({ text: `Samples still showing: ${showing}`, icon: LeafLine });
      setWorth(notes);
      setLast(
        data.last
          ? {
              title: data.last.title ?? "Item",
              at: data.last._updatedAt,
              image: data.last.image ? `${data.last.image}?w=108&h=132&fit=crop&auto=format` : undefined,
              href: data.last.slug
                ? `${SITE_ADDRESS}${data.last._type === "wedding" ? "/client" : "/pre-wedding"}/${data.last.slug}/`
                : SITE_ADDRESS,
            }
          : null,
      );
      setLoaded(true);
    })();
    return () => {
      live = false;
    };
  }, [client]);

  const open = (type: string, id?: string) =>
    router.navigateIntent(id ? "edit" : "create", id ? { id, type } : { type });

  return (
    <div className="st-page">
      <div className="st-page__inner">
        <section className="st-hero st-rise">
          <div className="st-hero__text">
            <h1 className="st-title">
              {greeting()}, {MANAGER_NAME}
            </h1>
            <p className="st-lede">What would you like to do today?</p>
            <button type="button" className="st-spotbtn" onClick={openSpotlight} aria-label="Search or jump to anything" aria-keyshortcuts="Meta+K Control+K">
              <SearchLine />
              <span>Add a wedding, a couple&rsquo;s name, a page…</span>
              <kbd>⌘K</kbd>
            </button>
            <button type="button" className="st-hero__film" onClick={() => router.navigate({ tool: "tutorials" })}>
              New here? Watch the short film →
            </button>
          </div>
          <Record state={website.state} />
        </section>

        <div className="st-actions">
          {quick.map(([title, text, type, Icon], index) => (
            <button
              key={title}
              type="button"
              className="st-action st-rise"
              style={{ "--i": index + 1 } as CSSProperties}
              onPointerMove={followCursor}
              onClick={() => (type ? open(type) : open("homepage", "homepage"))}
            >
              <span className="st-action__icon">
                <Icon />
              </span>
              <span>
                <b>{title}</b>
                <span>{text}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="st-panels">
          <Block title="Waiting for you" index={7}>
            {!loaded ? <Skeleton /> : null}
            {loaded && waiting.length === 0 ? (
              <p className="st-empty">
                <span className="st-row__mark">
                  <CheckLine />
                </span>
                Nothing waiting. You&rsquo;re all caught up.
              </p>
            ) : null}
            {waiting.map((row) => {
              const Icon = row.icon;
              return (
                <button key={`${row.id}-${row.note}`} type="button" className="st-row" onClick={() => open(row.type, row.id)}>
                  <span className="st-row__mark">
                    <Icon />
                  </span>
                  <span className="st-row__text">
                    {row.title}
                    <small>{row.note}</small>
                  </span>
                  <span className="st-row__go" aria-hidden="true">→</span>
                </button>
              );
            })}
          </Block>
          <Block title="Worth a look" index={8}>
            {!loaded ? <Skeleton /> : null}
            {loaded && worth.length === 0 ? (
              <p className="st-empty">
                <span className="st-row__mark">
                  <CheckLine />
                </span>
                All in order.
              </p>
            ) : null}
            {worth.map((note) => {
              const Icon = note.icon;
              const inner = (
                <>
                  <span className="st-row__mark">
                    <Icon />
                  </span>
                  <span className="st-row__text">{note.text}</span>
                </>
              );
              return note.intent ? (
                <button key={note.text} type="button" className="st-row" onClick={() => open(note.intent![0], note.intent![1])}>
                  {inner}
                  <span className="st-row__go">Fix →</span>
                </button>
              ) : (
                <div key={note.text} className="st-row">
                  {inner}
                </div>
              );
            })}
          </Block>
        </div>
        <Block title="Last published" index={9}>
          {!loaded ? <Skeleton /> : null}
          {loaded && last ? (
            <div className="st-last">
              {last.image ? <img src={last.image} alt="" /> : null}
              <p style={{ margin: 0 }}>
                <b>{last.title}</b>
                <small>
                  {minutesAgo(last.at)} ·{" "}
                  {website.liveSince && website.liveSince > last.at ? (
                    <>
                      Live on the website ✓{" "}
                      <a href={last.href} target="_blank" rel="noreferrer">
                        Open page ↗
                      </a>
                    </>
                  ) : website.state === "failed" ? (
                    "The website didn't update. Your work is safe."
                  ) : (
                    "Publishing… the website updates in about 10 minutes."
                  )}
                </small>
              </p>
            </div>
          ) : null}
          {loaded && !last ? <p className="st-empty">Nothing published yet.</p> : null}
        </Block>
      </div>
    </div>
  );
}
