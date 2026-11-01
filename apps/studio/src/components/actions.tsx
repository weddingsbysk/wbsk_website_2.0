import { useState } from "react";
import { useClient, useDocumentOperation, type DocumentActionDescription, type DocumentActionProps } from "sanity";

const PAGE_NOUN: Record<string, { list: string; removed: string }> = {
  wedding: { list: "the Weddings page", removed: "the Weddings page" },
  destination: { list: "the record arc", removed: "the Pre-wedding page" },
};

function nameOf(props: DocumentActionProps) {
  const doc = (props.draft ?? props.published) as Record<string, string> | null;
  if (!doc) return "this";
  return doc.firstName ? `${doc.firstName} & ${doc.secondName}` : (doc.name ?? "this");
}

function useStatusChange(props: DocumentActionProps) {
  const { patch, publish } = useDocumentOperation(props.id, props.type);
  return (status: string) => {
    patch.execute([{ set: { status } }]);
    publish.execute();
    props.onComplete();
  };
}

/** Nothing is deleted: both keep the entry and its photos, and can be undone (Decision 20). */
export function ArchiveAction(props: DocumentActionProps): DocumentActionDescription | null {
  const [open, setOpen] = useState(false);
  const change = useStatusChange(props);
  const status = (props.published as { status?: string } | null)?.status ?? "live";
  if (!props.published || status === "archived") return null;
  const name = nameOf(props);
  const noun = PAGE_NOUN[props.type]!;
  return {
    label: "Archive",
    onHandle: () => setOpen(true),
    dialog: open && {
      type: "confirm",
      message: `Archive ${name}? They leave ${noun.list}, but the page stays live and findable. You can switch it back on later.`,
      onCancel: () => setOpen(false),
      onConfirm: () => change("archived"),
    },
  };
}

export function RemoveAction(props: DocumentActionProps): DocumentActionDescription | null {
  const [open, setOpen] = useState(false);
  const change = useStatusChange(props);
  const status = (props.published as { status?: string } | null)?.status ?? "live";
  if (!props.published || status === "removed") return null;
  const name = nameOf(props);
  const noun = PAGE_NOUN[props.type]!;
  return {
    label: "Remove from website",
    tone: "critical",
    onHandle: () => setOpen(true),
    dialog: open && {
      type: "confirm",
      message: `Remove ${name} from the website? Their page will lead to ${noun.removed}. You can switch it back on later.`,
      onCancel: () => setOpen(false),
      onConfirm: () => change("removed"),
    },
  };
}

export function RestoreAction(props: DocumentActionProps): DocumentActionDescription | null {
  const change = useStatusChange(props);
  const status = (props.published as { status?: string } | null)?.status ?? "live";
  if (!props.published || status === "live") return null;
  return { label: "Switch back on", onHandle: () => change("live") };
}

/** Any published change starts a rebuild, so "Try again" is a small touch to Site settings (Decision 19). */
export function useTryAgain() {
  const client = useClient({ apiVersion: "2026-11-01" });
  return () => client.patch("siteSettings").set({ rebuildRequested: new Date().toISOString() }).commit();
}
