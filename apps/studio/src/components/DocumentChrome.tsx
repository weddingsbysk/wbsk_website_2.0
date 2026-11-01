import { useEffect, useMemo } from "react";
import { useEditState, useFormValue, useValidationStatus, type InputProps, type ObjectInputProps, type Path } from "sanity";
import { useDocumentPane } from "sanity/structure";
import { PREVIEW_INSPECTOR } from "../preview/inspector";

const CHROME_TYPES = new Set(["wedding", "destination", "preWeddingShoot", "film", "review", "reactionVideo", "teamMember", "homepage", "preWeddingPage"]);

function friendly(path: Path, message: string): string {
  const last = path.filter((p) => typeof p === "string").at(-1);
  if (last === "description" || message.startsWith("Add a description")) return "a photo description";
  return message.replace(/^Add (the |a |an )?/, "").replace(/\.$/, "");
}

/**
 * Wraps the whole form: ticks on finished step tabs, and the bar listing what's left before
 * publishing (Decision 18). Publish itself is locked by the same validation.
 */
function Chrome(props: ObjectInputProps) {
  const id = (useFormValue(["_id"]) as string | undefined)?.replace(/^drafts\./, "") ?? "";
  const type = props.schemaType.name;
  const { validation } = useValidationStatus(id, type, false);
  const { draft, published } = useEditState(id, type);
  const errors = useMemo(() => validation.filter((m) => m.level === "error"), [validation]);
  const { inspector, inspectors, openInspector } = useDocumentPane();
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
          return !incomplete && fieldsInGroup ? { ...g, title: `${g.title} ✓` } : g;
        }),
    [props.groups, errors, fieldGroup],
  );

  const left = [...new Set(errors.map((m) => friendly(m.path, m.message)))];
  const descriptionsMissing = errors.filter((m) => friendly(m.path, m.message) === "a photo description").length;
  const list = left.map((item) =>
    item === "a photo description" ? `${descriptionsMissing} photo description${descriptionsMissing === 1 ? "" : "s"}` : item,
  );
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
        <div>{list.length ? `Before publishing: ${list.join(" · ")}` : "Nothing left. Ready to publish."}</div>
      </div>
    </div>
  );
}

export function DocumentInput(props: InputProps) {
  const isRoot = props.id === "root" && props.schemaType.type?.name === "document";
  if (isRoot && CHROME_TYPES.has(props.schemaType.name)) return <Chrome {...(props as ObjectInputProps)} />;
  return props.renderDefault(props);
}
