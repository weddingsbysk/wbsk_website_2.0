import type { NavbarProps } from "sanity";
import logoUrl from "../../../web/public/wbsk-logo.svg";
import bodoniUrl from "../../../web/src/fonts/bodoni-moda.woff2?url";
import hankenUrl from "../../../web/src/fonts/hanken-grotesk.woff2?url";

// Decision 17: Bodoni Moda for headings and names, Hanken Grotesk for interface text.
const fontFaces = `
@font-face { font-family: "Bodoni Moda"; src: url("${bodoniUrl}") format("woff2"); font-weight: 400 500; font-display: swap; }
@font-face { font-family: "Hanken Grotesk"; src: url("${hankenUrl}") format("woff2"); font-weight: 400 600; font-display: swap; }
`;

/** Logo and STUDIO in the dark top bar (Decision 17), with the Studio's own bar beside it. */
export function WbskNavbar(props: NavbarProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", background: "#1F1914" }}>
      <style>{fontFaces}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px 0 16px", flex: "none" }}>
        <img src={logoUrl} alt="WBSK" style={{ height: 22, width: "auto", display: "block" }} />
        <span style={{ color: "#DDAF3A", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em" }}>STUDIO</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>{props.renderDefault(props)}</div>
    </div>
  );
}
