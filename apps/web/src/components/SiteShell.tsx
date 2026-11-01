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

const COMMIT_TIMEOUT_MS = 1500;
const DUSK_MS = 220;

const pathOf = (href: string) => href.split("#")[0] ?? href;

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const duskRef = useRef<HTMLDivElement>(null);
  const commitRef = useRef<(() => void) | null>(null);

  // Whatever is waiting on the new page, it has now rendered.
  useLayoutEffect(() => {
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
    (navigate: () => void, direction: "forward" | "back") => {
      if (prefersReducedMotion()) {
        navigate();
        return;
      }
      if (typeof document.startViewTransition === "function") {
        document.documentElement.dataset.pageDirection = direction;
        document.startViewTransition(() => {
          navigate();
          return waitForCommit();
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
      if (prefersReducedMotion()) return;
      if (typeof document.startViewTransition === "function") {
        document.documentElement.dataset.pageDirection = "back";
        document.startViewTransition(() => waitForCommit());
      }
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
        changePage(() => router.push(href), "forward");
      };
      return <NextLink href={href} onClick={handleClick} {...rest} />;
    },
    [changePage, router],
  );

  return (
    <LinkProvider value={renderLink}>
      <a className="wbsk-skip" href="#main">
        Skip to content
      </a>
      <Header
        items={navItems}
        enquireHref="/#enquire"
        homeHref="/"
        logoSrc={publicAsset("/wbsk-logo.svg")}
        currentPath={pathname}
        clearOverId={pathname === "/" || /^\/pre-wedding\/[^/]+\/?$/.test(pathname) ? "hero" : undefined}
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
    </LinkProvider>
  );
}
