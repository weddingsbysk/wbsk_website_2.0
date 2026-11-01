"use client";

import { ArrowIcon, CloseIcon } from "@wbsk/ui";
import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";

type Panel = { open: () => void };
const PanelContext = createContext<Panel>({ open: () => {} });
const SLIDE_MS = 450;

/** The form slides up over the page, so a couple never leaves the story (Decision 03). */
export function EnquiryPanelProvider({ children }: { children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const open = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    requestAnimationFrame(() => (dialog.dataset.open = "true"));
  }, []);
  const close = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    delete dialog.dataset.open;
    window.setTimeout(() => dialog.close(), SLIDE_MS);
  }, []);
  const value = useMemo(() => ({ open }), [open]);
  return (
    <PanelContext.Provider value={value}>
      {children}
      <dialog
        ref={dialogRef}
        className="wbsk-panel"
        aria-labelledby="wbsk-panel-title"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
      >
        <div className="wbsk-panel__sheet">
          <button type="button" className="wbsk-iconbutton wbsk-panel__close" aria-label="Close" onClick={close}>
            <CloseIcon />
          </button>
          <h2 id="wbsk-panel-title" className="wbsk-h2">
            Tell us about your wedding
          </h2>
          <p className="wbsk-lead wbsk-measure">The enquiry form arrives here in the next phase of the build.</p>
        </div>
      </dialog>
    </PanelContext.Provider>
  );
}

export function EnquireButton({ children, statement }: { children: ReactNode; statement?: boolean }) {
  const { open } = useContext(PanelContext);
  return (
    <button type="button" className={statement ? "wbsk-bigline" : "wbsk-button"} onClick={open}>
      <span>{children}</span>
      <ArrowIcon />
    </button>
  );
}
