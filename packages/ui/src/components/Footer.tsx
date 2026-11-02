import { WbskLink } from "../link-context";
import type { NavItem } from "./Header";

type Props = {
  items: NavItem[];
  privacyHref: string;
  homeHref: string;
  logoSrc: string;
  social: { label: string; href: string }[];
};

export function Footer({ items, privacyHref, homeHref, logoSrc, social }: Props) {
  return (
    <footer className="wbsk-footer" data-tone="dark">
      <div className="wbsk-container wbsk-footer__inner">
        <WbskLink
          href={homeHref}
          className="wbsk-footer__logo"
          aria-label="Weddings By Siddhant Kapoor, home"
        >
          <img src={logoSrc} alt="" width="104" height="24" loading="lazy" />
        </WbskLink>
        <nav aria-label="Footer">
          <ul className="wbsk-footer__links">
            {items.map((item) => (
              <li key={item.href}>
                <WbskLink href={item.href} className="wbsk-link">
                  {item.label}
                </WbskLink>
              </li>
            ))}
            <li>
              <WbskLink href={privacyHref} className="wbsk-link">
                Privacy
              </WbskLink>
            </li>
            {social.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="wbsk-link" rel="noopener" target="_blank">
                  {item.label}
                  <span className="wbsk-sr"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <p className="wbsk-footer__legal">© {new Date().getFullYear()} Weddings By Siddhant Kapoor</p>
      </div>
      {/* The mark set very large, running off the bottom edge, as a quiet last impression. */}
      <div className="wbsk-footer__mark" aria-hidden="true">
        <img src={logoSrc} alt="" width="2160" height="500" loading="lazy" />
      </div>
    </footer>
  );
}
