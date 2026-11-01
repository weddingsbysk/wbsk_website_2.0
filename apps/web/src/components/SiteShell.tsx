"use client";

import { Footer, Header, LinkProvider, type WbskLinkProps } from "@wbsk/ui";
import { prefersReducedMotion, startWheelSmoothing } from "@wbsk/ui/motion";
import { navItems, socialLinks } from "@wbsk/content";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";
import { publicAsset } from "../lib/site";
import { EnquiryPanelProvider, usePanel } from "./EnquiryPanel";

const COMMIT_TIMEOUT_MS = 1500;
const DUSK_MS = 220;

const pathOf = (href: string) => href.split("#")[0] ?? href;
const COVER_NAME = "wedding-cover";
const isStoryPage = (path: string) => /^\/(client|pre-wedding)\/[^/]+\/?$/.test(path);
const slugOf = (path: string) => path.split("/").filter(Boolean).at(-1) ?? "";

type Signature = "expand" | "next";

/** The header and menu's Enquire link opens the panel; without scripts it goes to the homepage form. */
function EnquireLink({ href, onClick, ...rest }: WbskLinkProps) {
  const { open } = usePanel();
  return (
    <a
      href={publicAsset(href)}
      onClick={(event) => {
        onClick?.(event);
        event.preventDefault();
        open();
      }}
      {...rest}
    />
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const duskRef = useRef<HTMLDivElement>(null);
  const commitRef = useRef<(() => void) | null>(null);
  const pathRef = useRef(pathname);
  // The last signature move, so browser Back can play the same one in reverse.
  const lastMoveRef = useRef<{ kind: Signature; from: string; to: string } | null>(null);

  // Whatever is waiting on the new page, it has now rendered.
  useLayoutEffect(() => {
    pathRef.current = pathname;
    commitRef.current?.();
    commitRef.current = null;
    if (duskRef.current) duskRef.current.dataset.active = "false";
  }, [pathname]);

  const waitForCommit = useCallback(
    () =>
      new Promise<void>((resolve) => {
        const timer = window.setTimeout(resolve, COMMIT_TIMEOUT_MS);
        commitRef.current = () => {
          window.clearTimeout(timer);
          resolve();
        };
      }),
    [],
  );

  const changePage = useCallback(
    (navigate: () => void, direction: "forward" | "back", kind?: Signature, frame?: HTMLElement | null) => {
      if (prefersReducedMotion()) {
        navigate();
        return;
      }
      if (typeof document.startViewTransition === "function") {
        const root = document.documentElement;
        root.dataset.pageDirection = direction;
        if (kind) root.dataset.pageTransition = kind;
        else delete root.dataset.pageTransition;
        // The card's photo becomes the shared element that grows into the cover (Decision 05).
        if (frame) frame.style.viewTransitionName = COVER_NAME;
        const transition = document.startViewTransition(() => {
          navigate();
          return waitForCommit();
        });
        void transition.finished.finally(() => {
          delete root.dataset.pageTransition;
          if (frame) frame.style.viewTransitionName = "";
        });
        return;
      }
      if (duskRef.current) duskRef.current.dataset.active = "true";
      window.setTimeout(navigate, DUSK_MS);
    },
    [waitForCommit],
  );

  useEffect(() => {
    const onPopState = () => {
      if (prefersReducedMotion() || typeof document.startViewTransition !== "function") return;
      const root = document.documentElement;
      const here = pathRef.current;
      const going = window.location.pathname.replace(publicAsset(""), "") || "/";
      // The enquiry panel uses history too, so Back can close it; that isn't a page change.
      if (going === here) return;
      const move = lastMoveRef.current;
      const reversing = move && move.to === here && move.from === going ? move : null;
      root.dataset.pageDirection = "back";
      if (reversing) root.dataset.pageTransition = reversing.kind;
      else delete root.dataset.pageTransition;
      let frame: HTMLElement | null = null;
      const transition = document.startViewTransition(async () => {
        await waitForCommit();
        if (reversing?.kind === "expand") {
          frame = document.querySelector<HTMLElement>(`[data-slug="${slugOf(here)}"] .wbsk-frame`);
          if (frame) frame.style.viewTransitionName = COVER_NAME;
        }
      });
      void transition.finished.finally(() => {
        delete root.dataset.pageTransition;
        if (frame) frame.style.viewTransitionName = "";
      });
      if (reversing) lastMoveRef.current = null;
    };
    window.addEventListener("popstate", onPopState, { capture: true });
    return () => window.removeEventListener("popstate", onPopState, { capture: true });
  }, [waitForCommit]);

  useEffect(() => {
    let stop = () => {};
    const start = () => {
      stop = startWheelSmoothing();
    };
    const idle = window.requestIdleCallback?.(start) ?? window.setTimeout(start, 400);
    return () => {
      window.cancelIdleCallback?.(idle);
      stop();
    };
  }, []);

  const renderLink = useCallback(
    ({ href, onClick, ...rest }: WbskLinkProps) => {
      if (href.endsWith("#enquire")) return <EnquireLink href={href} onClick={onClick} {...rest} />;
      const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          pathOf(href) === window.location.pathname.replace(publicAsset(""), "")
        ) {
          return;
        }
        event.preventDefault();
        const link = event.currentTarget;
        const kind = link.dataset.transition as Signature | undefined;
        if (kind) lastMoveRef.current = { kind, from: pathRef.current, to: pathOf(href) };
        const frame = kind === "expand" ? link.querySelector<HTMLElement>(".wbsk-frame") : null;
        changePage(() => router.push(href), "forward", kind, frame);
      };
      return <NextLink href={href} onClick={handleClick} {...rest} />;
    },
    [changePage, router],
  );

  return (
    <LinkProvider value={renderLink}>
      <EnquiryPanelProvider pathname={pathname}>
      <a className="wbsk-skip" href="#main">
        Skip to content
      </a>
      <Header
        items={navItems}
        enquireHref="/#enquire"
        homeHref="/"
        logoSrc={publicAsset("/wbsk-logo.svg")}
        currentPath={pathname.startsWith("/client/") ? "/weddings/" : pathname}
        clearOverId={pathname === "/" || isStoryPage(pathname) ? "hero" : undefined}
      />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <Footer
        items={navItems}
        privacyHref="/privacy/"
        homeHref="/"
        logoSrc={publicAsset("/wbsk-logo.svg")}
        social={socialLinks}
      />
      <div ref={duskRef} className="wbsk-dusk" aria-hidden="true" />
      </EnquiryPanelProvider>
    </LinkProvider>
  );
}
