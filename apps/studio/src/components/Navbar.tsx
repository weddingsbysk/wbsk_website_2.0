import type { NavbarProps } from "sanity";
import logoUrl from "../../../web/public/wbsk-logo.svg";

/** Logo and STUDIO in the dark top bar (Decision 17), with the Studio's own bar beside it. */
export function WbskNavbar(props: NavbarProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", background: "#1F1914" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px 0 16px", flex: "none" }}>
        <img src={logoUrl} alt="WBSK" style={{ height: 22, width: "auto", display: "block" }} />
        <span style={{ color: "#DDAF3A", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em" }}>STUDIO</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>{props.renderDefault(props)}</div>
    </div>
  );
}
