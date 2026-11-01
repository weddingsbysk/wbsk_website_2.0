import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useDocumentPane } from "sanity/structure";
import { PreviewFrame } from "./PreviewFrame";
import { WeddingPreview, type DraftDocument } from "./WeddingPreview";

const buttonStyle = (active: boolean) => ({
  border: 0,
  borderRadius: 6,
  padding: "6px 12px",
  minHeight: 32,
  cursor: "pointer",
  font: "inherit",
  fontSize: 13,
  background: active ? "#FFFDF9" : "transparent",
  color: "#231C16",
  boxShadow: active ? "0 1px 2px rgb(58 36 16 / 0.2)" : "none",
});

const FRAME_WIDTH = { phone: 390, desktop: 1440 };

/** The live preview beside the form, plus true-size desktop (Decision 22). */
export function PreviewPane() {
  const { displayed } = useDocumentPane();
  const [mode, setMode] = useState<"phone" | "desktop">("phone");
  const [full, setFull] = useState(false);
  const [fullMode, setFullMode] = useState<"phone" | "desktop">("desktop");
  const [box, setBox] = useState({ width: 0, height: 0 });
  const doc = (displayed ?? {}) as DraftDocument;

  const measure = useCallback((element: HTMLDivElement | null) => {
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setBox({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // The site renders at its true width, then shrinks to fit the panel, so nothing is cut off.
  const frameWidth = FRAME_WIDTH[mode];
  const scale = box.width ? Math.min(1, box.width / frameWidth) : 1;

  useEffect(() => {
    if (!full) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFull(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [full]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#EDE4D6", color: "#231C16", fontSize: 13 }} data-testid="wbsk-preview">
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", flexWrap: "wrap" }}>
        <strong style={{ letterSpacing: "0.1em", fontSize: 12 }}>PREVIEW · DRAFT</strong>
        <span style={{ marginLeft: "auto", display: "flex", gap: 2, background: "rgb(35 28 22 / 0.08)", borderRadius: 8, padding: 2 }}>
          <button type="button" style={buttonStyle(mode === "desktop")} onClick={() => setMode("desktop")}>Desktop</button>
          <button type="button" style={buttonStyle(mode === "phone")} onClick={() => setMode("phone")}>Phone</button>
        </span>
        <button type="button" style={buttonStyle(false)} onClick={() => setFull(true)}>Open full size ↗</button>
      </div>
      <div ref={measure} style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", justifyContent: "center", padding: 12 }}>
        <div style={{ width: frameWidth * scale, height: box.height, flex: "none", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 24px rgb(58 36 16 / 0.2)" }}>
          <div style={{ width: frameWidth, height: box.height / scale, transform: `scale(${scale})`, transformOrigin: "top left" }}>
            <PreviewFrame title="Phone or desktop preview of this draft" width={frameWidth} height="100%">
              <WeddingPreview doc={doc} phone={mode === "phone"} />
            </PreviewFrame>
          </div>
        </div>
      </div>
      <p style={{ margin: 0, padding: "8px 12px", textAlign: "center" }}>Updates as you type. Only you can see drafts.</p>
      {/* On the page body, so the Studio's own panes can't clip or cover it. */}
      {full
        ? createPortal(
            <div role="dialog" aria-modal="true" aria-label="Full size preview" style={{ position: "fixed", inset: 0, zIndex: 100000, background: "#1F1914", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", color: "#F5EFE6" }}>
                <strong style={{ letterSpacing: "0.1em", fontSize: 12 }}>PREVIEW · DRAFT · Only you can see drafts</strong>
                <span style={{ marginLeft: "auto", display: "flex", gap: 2, background: "rgb(245 239 230 / 0.15)", borderRadius: 8, padding: 2 }}>
                  <button type="button" style={buttonStyle(fullMode === "desktop")} onClick={() => setFullMode("desktop")}>Desktop</button>
                  <button type="button" style={buttonStyle(fullMode === "phone")} onClick={() => setFullMode("phone")}>Phone</button>
                </span>
                <button type="button" autoFocus style={{ ...buttonStyle(true) }} onClick={() => setFull(false)}>Close · Esc</button>
              </div>
              <div style={{ flex: 1, minHeight: 0, display: "flex", justifyContent: "center" }}>
                <PreviewFrame title="Full size preview of this draft" width={fullMode === "phone" ? 390 : "100%"} height="100%">
                  <WeddingPreview doc={doc} phone={fullMode === "phone"} />
                </PreviewFrame>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
