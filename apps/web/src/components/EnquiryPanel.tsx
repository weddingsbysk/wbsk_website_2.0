"use client";

import type { FormKind } from "@wbsk/content";
import { ArrowIcon, CloseIcon } from "@wbsk/ui";
import { prefersReducedMotion } from "@wbsk/ui/motion";
import dynamic from "next/dynamic";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { loadFormsBundle, type FormsBundle } from "../lib/submit";

type Panel = { open: (kind?: FormKind) => void };
const PanelContext = createContext<Panel>({ open: () => {} });
const SLIDE_MS = 450;
const SWIPE_CLOSE_PIXELS = 90;

// The form's code loads the first time a panel opens, so it costs other pages nothing.
const EnquiryForm = dynamic(() => import("./EnquiryForm").then((module) => module.EnquiryForm));

export const usePanel = () => useContext(PanelContext);

/**
 * The form slides up over the page, so a couple never leaves the story (Decision 03). Pre-wedding
 * pages open the pre-wedding form; everywhere else opens the wedding form (Decision 08).
 */
export function EnquiryPanelProvider({ children, pathname }: { children: ReactNode; pathname: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnRef = useRef<HTMLElement | null>(null);
  const swipeRef = useRef<number | null>(null);
  const historyRef = useRef(false);
  const [kind, setKind] = useState<FormKind | null>(null);
  const [bundle, setBundle] = useState<FormsBundle | null>(null);
  const [failed, setFailed] = useState(false);

  const hide = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog?.open) return;
    delete dialog.dataset.open;
    window.setTimeout(() => dialog.close(), prefersReducedMotion() ? 0 : SLIDE_MS);
  }, []);

  // Back closes the panel rather than leaving the page (Decision 03).
  const close = useCallback(() => {
    if (historyRef.current) {
      historyRef.current = false;
      window.history.back();
    }
    hide();
  }, [hide]);

  const open = useCallback(
    (requested?: FormKind) => {
      const dialog = dialogRef.current;
      if (!dialog || dialog.open) return;
      returnRef.current = document.activeElement as HTMLElement | null;
      setKind(requested ?? (pathname.startsWith("/pre-wedding") ? "preWedding" : "wedding"));
      setFailed(false);
      loadFormsBundle().then(setBundle).catch(() => setFailed(true));
      dialog.showModal();
      window.history.pushState({ wbskPanel: true }, "");
      historyRef.current = true;
      requestAnimationFrame(() => (dialog.dataset.open = "true"));
    },
    [pathname],
  );

  useEffect(() => {
    const onPop = () => {
      historyRef.current = false;
      hide();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [hide]);

  // wbsk.in/#enquire opens the homepage with the panel already up (Decision 03).
  useEffect(() => {
    if (window.location.hash === "#enquire") open("wedding");
  }, [open]);

  const value = useMemo(() => ({ open }), [open]);
  const config = kind ? bundle?.forms[kind] : null;

  return (
    <PanelContext.Provider value={value}>
      {children}
      <dialog
        ref={dialogRef}
        className="wbsk-panel"
        aria-label="Enquiry form"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={() => returnRef.current?.focus?.()}
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
        onTouchStart={(event) => {
          const sheet = dialogRef.current;
          swipeRef.current = sheet && sheet.scrollTop <= 0 ? (event.touches[0]?.clientY ?? null) : null;
        }}
        onTouchEnd={(event) => {
          const start = swipeRef.current;
          swipeRef.current = null;
          const end = event.changedTouches[0]?.clientY;
          if (start !== null && end !== undefined && end - start > SWIPE_CLOSE_PIXELS) close();
        }}
      >
        <div className="wbsk-panel__sheet">
          <button type="button" className="wbsk-iconbutton wbsk-panel__close" aria-label="Close" onClick={close}>
            <CloseIcon />
          </button>
          {kind === "wedding" && bundle?.packages.length ? (
            <ul className="wbsk-packages wbsk-packages--row">
              {bundle.packages.map((item) => (
                <li key={item.name}>
                  <strong>{item.name}</strong> <span>{item.line}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {config ? <EnquiryForm key={kind} config={config} /> : null}
          {failed ? (
            <p className="wbsk-lead" role="alert">
              The form couldn&rsquo;t load. Please check your connection and try again.
            </p>
          ) : null}
        </div>
      </dialog>
    </PanelContext.Provider>
  );
}

export function EnquireButton({
  children,
  statement,
  kind,
}: {
  children: ReactNode;
  statement?: boolean;
  kind?: FormKind;
}) {
  const { open } = useContext(PanelContext);
  return (
    <button type="button" className={statement ? "wbsk-bigline" : "wbsk-button"} onClick={() => open(kind)}>
      <span>{children}</span>
      <ArrowIcon />
    </button>
  );
}
