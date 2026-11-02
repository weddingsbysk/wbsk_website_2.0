import { useEffect, useMemo, useState } from "react";
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
const RING = 2 * Math.PI * 15.5;

/**
 * Wraps the whole form: ticks on finished step tabs, and the bar listing what's left before
 * publishing (Decision 18). Publish itself is locked by the same validation.
 */
function Chrome(props: ObjectInputProps) {
  const id = (useFormValue(["_id"]) as string | undefined)?.replace(/^drafts\./, "") ?? "";
  const type = props.schemaType.name;
  const { draft, published } = useEditState(id, type);
  const { inspector, inspectors, openInspector, validation } = useDocumentPane();
  const [showAll, setShowAll] = useState(false);
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

  // What's left, each a chip that jumps to the first place it applies.
  const left = new Map<string, { label: string; path: Path; count: number }>();
  for (const message of errors) {
    // The address is made from the names, so it's never one more thing to do.
    if (message.path[0] === "address" && errors.length > 1) continue;
    const name = friendly(message.path, message.message, props.schemaType);
    const seen = left.get(name);
    if (seen) seen.count += 1;
    else left.set(name, { label: name, path: message.path, count: 1 });
  }
  const list = [...left.values()].map((item) =>
    item.label === "a photo description" ? { ...item, label: `${item.count} photo description${item.count === 1 ? "" : "s"}` } : item,
  );
  const more = list.length - MAX_LISTED;
  // Opens the step a field lives on first; a field on a closed step can't take focus.
  const jumpTo = (path: Path) => {
    const step = fieldGroup.get(String(path[0]))?.[0];
    if (step) props.onFieldGroupSelect(step);
    requestAnimationFrame(() => props.onPathFocus(path));
  };
  const summary = isNew ? "Fill in each step. This bar lists what's left before you can publish." : list.length ? "Before publishing:" : "Nothing left. Ready to publish.";

  // The ring fills as steps finish, or simply when nothing's left on a form without steps.
  const stepNames = (props.groups ?? []).filter((g) => g.name !== "all-fields").map((g) => g.name);
  const stepsLeft = stepNames.filter((name) => errors.some((m) => fieldGroup.get(String(m.path[0]))?.includes(name))).length;
  const progress = isNew ? 0 : stepNames.length ? (stepNames.length - stepsLeft) / stepNames.length : errors.length ? 0.5 : 1;
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
      <div role="status" aria-live="polite" className="st-bar">
        <svg className="st-ring" viewBox="0 0 38 38" aria-hidden="true">
          <circle cx="19" cy="19" r="15.5" />
          <circle cx="19" cy="19" r="15.5" strokeDasharray={RING} strokeDashoffset={RING * (1 - progress)} />
          {progress === 1 ? <path d="m13 19.5 4.2 4.2L25.5 15" /> : null}
        </svg>
        <div>
          <strong>{state}</strong>
          {publishing && website.state === "failed" ? (
            <div>
              The website didn&apos;t update. Your work is safe. Try again, or tell Siddhant.{" "}
              <button type="button" className="st-bar__link" onClick={() => void tryAgain()}>
                Try again
              </button>
            </div>
          ) : publishing ? (
            <div>Publishing… the website updates in about 10 minutes. You can keep working.</div>
          ) : !draft && published && onSite ? (
            <div>
              Live on the website ✓ ·{" "}
              <a href={liveLink} target="_blank" rel="noreferrer">
                Open page ↗
              </a>
            </div>
          ) : (
            <div>
              {summary}
              {!isNew && list.length ? (
                <div className="st-chips">
                  {(showAll ? list : list.slice(0, MAX_LISTED)).map((item) => (
                    <button key={item.label} type="button" className="st-chip" onClick={() => jumpTo(item.path)}>
                      {item.label}
                    </button>
                  ))}
                  {more > 0 ? (
                    <button type="button" className="st-chip st-chip--more" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>
                      {showAll ? "Show fewer" : `and ${more} more`}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DocumentInput(props: InputProps) {
  const isRoot = props.id === "root" && props.schemaType.type?.name === "document";
  if (isRoot && CHROME_TYPES.has(props.schemaType.name)) return <Chrome {...(props as ObjectInputProps)} />;
  return props.renderDefault(props);
}
