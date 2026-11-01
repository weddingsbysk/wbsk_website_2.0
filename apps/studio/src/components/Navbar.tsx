import type { NavbarProps } from "sanity";
import { SITE_ADDRESS } from "../brand";
import { minutesAgo, useWebsiteStatus } from "../tools/useWebsiteStatus";
import logoUrl from "../../../web/public/wbsk-logo.svg";
import bodoniUrl from "../../../web/src/fonts/bodoni-moda.woff2?url";
import hankenUrl from "../../../web/src/fonts/hanken-grotesk.woff2?url";

// Decision 17: Bodoni Moda for headings and names, Hanken Grotesk for interface text. The last rule
// keeps a selected list row readable on its gold background.
const studioStyles = `
@font-face { font-family: "Bodoni Moda"; src: url("${bodoniUrl}") format("woff2"); font-weight: 400 500; font-display: swap; }
@font-face { font-family: "Hanken Grotesk"; src: url("${hankenUrl}") format("woff2"); font-weight: 400 600; font-display: swap; }
[data-selected] [data-ui="Text"], [data-selected] [data-ui="Text"] * { color: #FFFDF9 !important; }
`;

const WORDS = {
  unknown: "Website",
  live: "Website live",
  updating: "Website updating…",
  failed: "Website didn't update",
};

/** Logo and STUDIO, the website's status and a way to it (Decisions 17 and 19). */
export function WbskNavbar(props: NavbarProps) {
  const status = useWebsiteStatus();
  const detail = status.state === "live" && status.liveSince ? ` · updated ${minutesAgo(status.liveSince)}` : "";
  return (
    <div style={{ display: "flex", alignItems: "center", background: "#1F1914" }}>
      <style>{studioStyles}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px 0 16px", flex: "none" }}>
        <img src={logoUrl} alt="WBSK" style={{ height: 22, width: "auto", display: "block" }} />
        <span style={{ color: "#DDAF3A", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em" }}>STUDIO</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>{props.renderDefault(props)}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "0 14px", flex: "none", color: "#F5EFE6", fontSize: 12 }}>
        <span style={{ whiteSpace: "nowrap" }} role="status">
          {WORDS[status.state]}
          {detail}
        </span>
        <a href={SITE_ADDRESS} target="_blank" rel="noreferrer" style={{ color: "#DDAF3A", whiteSpace: "nowrap" }}>
          View website ↗
        </a>
      </div>
    </div>
  );
}
