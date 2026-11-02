import { useEffect, useLayoutEffect, useRef, useState, type ComponentType, type MouseEvent } from "react";
import { MANAGER_NAME, SITE_ADDRESS } from "../brand";
import { minutesAgo, useWebsiteStatus } from "../tools/useWebsiteStatus";
import logoUrl from "../../../web/public/wbsk-logo.svg";
import { ContentLine, GuideLine, HomeLine, OutLine, PhotosLine, PlayLine, SearchLine } from "./icons";
import { openSpotlight } from "./Spotlight";
import { useCurrentUser, useRouter, useRouterState, useWorkspace } from "./studio-hooks";

const WORDS = {
  unknown: "Website",
  live: "Website live",
  updating: "Website updating…",
  failed: "Website didn't update",
};

const TOOLS: Record<string, { label: string; icon: ComponentType }> = {
  home: { label: "Home", icon: HomeLine },
  content: { label: "Content", icon: ContentLine },
  photos: { label: "Photos", icon: PhotosLine },
  guide: { label: "Guide", icon: GuideLine },
  tutorials: { label: "Tutorials", icon: PlayLine },
};

function UserMenu() {
  const user = useCurrentUser();
  const { auth } = useWorkspace();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const name = user?.name ?? MANAGER_NAME;
  return (
    <div ref={root} className="st-usermenu">
      <button type="button" className="st-avatar" aria-label={`Account: ${name}`} aria-expanded={open} onClick={() => setOpen(!open)}>
        {user?.profileImage ? <img src={user.profileImage} alt="" referrerPolicy="no-referrer" /> : name.slice(0, 1)}
      </button>
      {open ? (
        <div className="st-popup">
          <p>
            {name}
            {user?.email ? <small>{user.email}</small> : null}
          </p>
          <button type="button" onClick={() => void auth.logout?.()}>
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Logo, the four tools, search, the website's status and a way to it (Decisions 17 and 19). */
export function WbskNavbar() {
  const status = useWebsiteStatus();
  const { tools } = useWorkspace();
  const router = useRouter();
  const current = useRouterState((state) => state.tool as string | undefined) ?? "home";
  const list = useRef<HTMLElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const detail = status.state === "live" && status.liveSince ? ` · updated ${minutesAgo(status.liveSince)}` : "";

  // The pill glides to whichever tool is open, and keeps up if the window changes size.
  useLayoutEffect(() => {
    const place = () => {
      const link = list.current?.querySelector<HTMLElement>('[aria-current="page"]');
      if (!link || !pill.current) return;
      pill.current.style.setProperty("--x", `${link.offsetLeft}px`);
      pill.current.style.setProperty("--w", `${link.offsetWidth}px`);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [current, tools]);

  const go = (event: MouseEvent, tool: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    router.navigate({ tool });
  };

  return (
    <header className="st-nav">
      <a className="st-nav__brand" href={router.resolvePathFromState({ tool: "home" })} onClick={(event) => go(event, "home")}>
        <img src={logoUrl} alt="WBSK" />
        <span>STUDIO</span>
      </a>
      <nav ref={list} className="st-tools" aria-label="Studio">
        <span ref={pill} className="st-tools__pill" aria-hidden="true" />
        {tools.map((tool) => {
          const known = TOOLS[tool.name];
          if (!known) return null;
          const Icon = known.icon;
          return (
            <a key={tool.name} href={router.resolvePathFromState({ tool: tool.name })} aria-current={current === tool.name ? "page" : undefined} onClick={(event) => go(event, tool.name)}>
              <Icon />
              <span>{known.label}</span>
            </a>
          );
        })}
      </nav>
      <div className="st-nav__right">
        <button type="button" className="st-navbtn st-navbtn--search" onClick={openSpotlight} aria-label="Search or jump to anything" aria-keyshortcuts="Meta+K Control+K">
          <SearchLine />
          <span>Search or jump to…</span>
          <kbd>⌘K</kbd>
        </button>
        <span className="st-status" role="status">
          <span className="st-dot" data-state={status.state} aria-hidden="true" />
          <span>
            {WORDS[status.state]}
            {detail}
          </span>
        </span>
        <a className="st-navbtn st-navbtn--view" href={SITE_ADDRESS} target="_blank" rel="noreferrer" aria-label="View website (opens in a new tab)">
          <span>View website</span>
          <OutLine />
        </a>
        <UserMenu />
      </div>
    </header>
  );
}
