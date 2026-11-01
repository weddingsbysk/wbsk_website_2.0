import { useEffect, useMemo } from "react";
import { useEditState, useFormValue, type InputProps, type ObjectInputProps, type ObjectSchemaType, type Path } from "sanity";
import { useDocumentPane } from "sanity/structure";
import { PREVIEW_INSPECTOR } from "../preview/inspector";
import { SITE_ADDRESS } from "../brand";
import { useWebsiteStatus } from "../tools/useWebsiteStatus";
import { useTryAgain } from "./actions";

const CHROME_TYPES = new Set(["wedding", "destination", "preWeddingShoot", "film", "review", "reactionVideo", "teamMember", "homepage", "preWeddingPage", "enquiryForm", "careerRole"]);

function friendly(path: Path, message: string, schemaType: ObjectSchemaType): string {
  const last = path.filter((p) => typeof p === "string").at(-1);
  if (last === "description" || message.startsWith("Add a description")) return "a photo description";
  // A bare "Required" says nothing on its own in the bar, so name the field instead.
  if (message === "Required") {
    const field = schemaType.fields.find((f) => f.name === path[0]);
    return (field?.type.title ?? String(path[0])).toLowerCase();
  }
  return message.replace(/^Add (the |a |an )?/, "").replace(/\.$/, "");
}

const MAX_LISTED = 4;

/**
 * Wraps the whole form: ticks on finished step tabs, and the bar listing what's left before
 * publishing (Decision 18). Publish itself is locked by the same validation.
 */
function Chrome(props: ObjectInputProps) {
  const id = (useFormValue(["_id"]) as string | undefined)?.replace(/^drafts\./, "") ?? "";
  const type = props.schemaType.name;
  const { draft, published } = useEditState(id, type);
  const { inspector, inspectors, openInspector, validation } = useDocumentPane();
  const errors = useMemo(() => validation.filter((m) => m.level === "error"), [validation]);
  // Nothing has been checked until the first change saves, so a blank form earns no ticks.
  const isNew = !draft && !published;
  const hasPreview = inspectors.some((item) => item.name === PREVIEW_INSPECTOR);

  // The live preview sits beside the form from the start on wide windows (Decision 22).
  useEffect(() => {
    if (hasPreview && !inspector && window.innerWidth >= 1100) openInspector(PREVIEW_INSPECTOR);
    // Only when the document opens, so closing the panel stays closed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPreview]);

  const fieldGroup = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const field of props.schemaType.fields) {
      const group = field.group;
      const names = Array.isArray(group) ? group : group ? [group] : [];
      map.set(field.name, names);
    }
    return map;
  }, [props.schemaType.fields]);

  const groups = useMemo(
    () =>
      (props.groups ?? [])
        .filter((g) => g.name !== "all-fields")
        .map((g) => {
          const incomplete = errors.some((m) => fieldGroup.get(String(m.path[0]))?.includes(g.name));
          const fieldsInGroup = [...fieldGroup.values()].some((names) => names.includes(g.name));
          return !isNew && !incomplete && fieldsInGroup ? { ...g, title: `${g.title} ✓` } : g;
        }),
    [props.groups, errors, fieldGroup, isNew],
  );

  const named = errors.map((m) => friendly(m.path, m.message, props.schemaType));
  const left = [...new Set(named)];
  const descriptionsMissing = named.filter((item) => item === "a photo description").length;
  const list = left.map((item) =>
    item === "a photo description" ? `${descriptionsMissing} photo description${descriptionsMissing === 1 ? "" : "s"}` : item,
  );
  const more = list.length - MAX_LISTED;
  const summary = isNew
    ? "Fill in each step. This bar lists what's left before you can publish."
    : list.length
      ? `Before publishing: ${list.slice(0, MAX_LISTED).join(" · ")}${more > 0 ? ` · and ${more} more` : ""}`
      : "Nothing left. Ready to publish.";
  const website = useWebsiteStatus();
  const tryAgain = useTryAgain();
  const publishedAt = (published as { _updatedAt?: string } | null)?._updatedAt;
  const onSite = Boolean(publishedAt && website.liveSince && website.liveSince > publishedAt);
  const address = (published as { address?: { current?: string } } | null)?.address?.current;
  const liveLink = address ? `${SITE_ADDRESS}${type === "wedding" ? "/client" : "/pre-wedding"}/${address}/` : SITE_ADDRESS;
  // What publishing is doing right now (Decision 19), once there's nothing newer in a draft.
  const publishing = !draft && published && !onSite && website.state !== "unknown";
  const state = draft ? (published ? "Unpublished changes" : "Draft · not on the website yet") : published ? "On the website" : "New";

  return (
    <div>
      {props.renderDefault({ ...props, groups })}
      <div
        role="status"
        aria-live="polite"
        style={{
          position: "sticky",
          bottom: 0,
          zIndex: 5,
          marginTop: 24,
          padding: "12px 16px",
          background: "#F5EFE6",
          borderRadius: 8,
          boxShadow: "0 -4px 16px rgb(58 36 16 / 0.08)",
          color: "#231C16",
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: "#7A5C17" }}>{state}</strong>
        {publishing && website.state === "failed" ? (
          <div>
            The website didn&apos;t update. Your work is safe. Try again, or tell Siddhant.{" "}
            <button type="button" onClick={() => void tryAgain()} style={{ font: "inherit", textDecoration: "underline", background: "none", border: 0, padding: 0, cursor: "pointer", color: "inherit" }}>
              Try again
            </button>
          </div>
        ) : publishing ? (
          <div>Publishing… the website updates in about 10 minutes. You can keep working.</div>
        ) : !draft && published && onSite ? (
          <div>
            Live on the website ✓ ·{" "}
            <a href={liveLink} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
              Open page ↗
            </a>
          </div>
        ) : (
          <div>{summary}</div>
        )}
      </div>
    </div>
  );
}

export function DocumentInput(props: InputProps) {
  const isRoot = props.id === "root" && props.schemaType.type?.name === "document";
  if (isRoot && CHROME_TYPES.has(props.schemaType.name)) return <Chrome {...(props as ObjectInputProps)} />;
  return props.renderDefault(props);
}
