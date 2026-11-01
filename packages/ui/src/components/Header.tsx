"use client";

import { useEffect, useRef, useState } from "react";
import { WbskLink } from "../link-context";
import { CloseIcon, MenuIcon } from "./icons";

export type NavItem = { label: string; href: string };

type Props = {
  items: NavItem[];
  enquireHref: string;
  homeHref: string;
  logoSrc: string;
  currentPath: string;
  /** Over a hero the bar is clear; it turns solid when this element has scrolled away. */
  clearOverId?: string;
};

export function Header({ items, enquireHref, homeHref, logoSrc, currentPath, clearOverId }: Props) {
  const [heroInView, setHeroInView] = useState(true);
  const solid = !clearOverId || !heroInView;
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const target = clearOverId ? document.getElementById(clearOverId) : null;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeroInView(Boolean(entry?.isIntersecting)),
      {
        rootMargin: "-72px 0px 0px 0px",
      },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [clearOverId, currentPath]);

  const closeMenu = () => dialogRef.current?.close();

  return (
    <header className="wbsk-header" data-solid={solid}>
      <div className="wbsk-header__inner wbsk-container">
        <WbskLink
          href={homeHref}
          className="wbsk-header__logo"
          aria-label="Weddings By Siddhant Kapoor, home"
        >
          <img src={logoSrc} alt="" width="173" height="40" />
        </WbskLink>
        <nav aria-label="Main" className="wbsk-header__nav">
          <ul>
            {items.map((item) => (
              <li key={item.href}>
                <WbskLink
                  href={item.href}
                  className="wbsk-link wbsk-header__navlink"
                  aria-current={currentPath.startsWith(item.href) ? "page" : undefined}
                >
                  {item.label}
                </WbskLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="wbsk-header__actions">
          <WbskLink href={enquireHref} className="wbsk-button wbsk-button--dark wbsk-button--small">
            <span>Enquire</span>
          </WbskLink>
          <button
            type="button"
            className="wbsk-iconbutton wbsk-header__menubutton"
            aria-label="Open menu"
            aria-haspopup="dialog"
            onClick={() => dialogRef.current?.showModal()}
          >
            <MenuIcon />
          </button>
        </div>
      </div>
      <dialog ref={dialogRef} className="wbsk-menu" aria-label="Menu">
        <div className="wbsk-menu__bar">
          <WbskLink
            href={enquireHref}
            className="wbsk-button wbsk-button--dark wbsk-button--small"
            onClick={closeMenu}
          >
            <span>Enquire</span>
          </WbskLink>
          <button
            type="button"
            className="wbsk-iconbutton"
            aria-label="Close menu"
            onClick={closeMenu}
          >
            <CloseIcon />
          </button>
        </div>
        <nav aria-label="Menu">
          <ul>
            {items.map((item) => (
              <li key={item.href}>
                <WbskLink href={item.href} className="wbsk-menu__link" onClick={closeMenu}>
                  {item.label}
                </WbskLink>
              </li>
            ))}
          </ul>
        </nav>
      </dialog>
    </header>
  );
}
