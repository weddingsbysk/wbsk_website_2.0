import type { LayoutProps } from "sanity";
import studioCss from "../theme/studio.css?inline";
import cardTexture from "../../../../packages/ui/src/textures/card-stock.webp?url";
import duskTexture from "../../../../packages/ui/src/textures/paper-dusk.webp?url";
import ivoryTexture from "../../../../packages/ui/src/textures/paper-ivory.webp?url";
import outfitUrl from "../../../web/src/fonts/outfit.woff2?url";
import playfairUrl from "../../../web/src/fonts/playfair-display.woff2?url";
import { Spotlight } from "./Spotlight";

// The same type and paper as the website.
const shared = `
@font-face { font-family: "Playfair Display"; src: url("${playfairUrl}") format("woff2"); font-weight: 500 700; font-display: swap; }
@font-face { font-family: "Outfit"; src: url("${outfitUrl}") format("woff2"); font-weight: 400 500; font-display: swap; }
:root { --st-tex-ivory: url("${ivoryTexture}"); --st-tex-dusk: url("${duskTexture}"); --st-tex-card: url("${cardTexture}"); }
`;

/** Wraps the whole Studio: its look, and Cmd+K from anywhere. */
export function StudioShell(props: LayoutProps) {
  return (
    <>
      <style>{shared + studioCss}</style>
      {props.renderDefault(props)}
      <Spotlight />
    </>
  );
}
