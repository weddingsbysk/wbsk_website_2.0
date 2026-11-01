import { useCallback, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import previewCss from "./preview.css?inline";

/**
 * Renders the real website components inside an iframe, so the phone width triggers the real
 * phone layout and the site's styles can't touch the Studio's. Drafts come from the logged-in
 * Studio session; nothing is stored or sent anywhere.
 */
export function PreviewFrame({ width, height, title, children }: { width: number | string; height: number | string; title: string; children: ReactNode }) {
  const [mount, setMount] = useState<HTMLElement | null>(null);

  const attach = useCallback((frame: HTMLIFrameElement | null) => {
    const doc = frame?.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(
      '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body></body></html>',
    );
    doc.close();
    const style = doc.createElement("style");
    style.textContent = previewCss;
    doc.head.appendChild(style);
    const motion = doc.createElement("style");
    motion.textContent = "*, ::before, ::after { transition: none !important; animation: none !important; }";
    doc.head.appendChild(motion);
    setMount(doc.body);
  }, []);

  return (
    <iframe ref={attach} title={title} style={{ width, height, border: 0, display: "block", background: "#F5EFE6" }}>
      {mount ? createPortal(children, mount) : null}
    </iframe>
  );
}
