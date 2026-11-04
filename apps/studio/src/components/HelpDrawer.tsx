import { useEffect, useRef } from "react";
import { useRouter } from "./studio-hooks";

/** Short answers for the kind of entry someone has open, so nobody has to leave their work to find them. */
const HELP: Record<string, { title: string; steps: string[]; note?: string }> = {
  wedding: {
    title: "Adding a wedding",
    steps: [
      "Couple: their names and where it was. The website address fills in by itself.",
      "Photos: six photos. Album cover (tall 3:7), bride page and groom page, card (4:5), desktop cover (21:9) and phone cover (3:4).",
      "Gallery: drop in the photos, and give each one a short description. You can't publish without them, and Google and screen readers rely on them.",
      "Story and films: a few lines, then the YouTube links and their posters.",
      "Homepage: switch it on to put this album in the row on the homepage.",
    ],
    note: "The bar below lists what's left. Press any chip to jump straight there.",
  },
  destination: {
    title: "Adding a destination",
    steps: ["Name the place, and add its black-and-white artwork and two covers.", "Its record appears on the Pre-wedding page once it has a shoot.", "Add shoots under Pre-wedding, then Shoots, and pick this destination."],
  },
  preWeddingShoot: {
    title: "Adding a pre-wedding shoot",
    steps: ["Pick its destination, or more than one.", "Choose Full-length or Concept.", "Add its films and photos. The destination's page fills itself."],
  },
  film: {
    title: "Adding a film",
    steps: ["Paste the YouTube link, unlisted or public.", "Add a 16:9 poster, so the website never shows YouTube's own picture.", "Featured puts it on the homepage. Show on Films page puts it there. It can be both."],
  },
  review: {
    title: "Adding a review",
    steps: ["Ask the couple's permission first.", "Paste their words, and pick the one line to show large.", "Switch on Approved, or it won't appear."],
  },
  teamMember: {
    title: "Adding a team member",
    steps: ["Name and role.", "A black-and-white portrait, 4:5, finished in Lightroom. The website doesn't convert colour.", "A few lines in their own words."],
  },
  homepage: {
    title: "The homepage",
    steps: ["The cover video needs a desktop and a phone version, with a poster for each.", "Words here are the ones on the page. Leave one empty to use the standard wording.", "The albums and films come from their own entries, using their Homepage and Featured switches."],
  },
  preWeddingPage: {
    title: "The Pre-wedding page",
    steps: ["The cover video and its posters, as on the homepage.", "The two offerings, each with a name, a few lines, films and photos.", "The records fill themselves from Destinations."],
  },
  enquiryForm: {
    title: "The enquiry chat",
    steps: [
      "On the website, couples answer these one at a time, as a chat. It follows this script; it isn't an AI.",
      "Open a question to reword it. How the chat asks it and What the chat says back are the lines they read.",
      "Switch off Shown to leave a question out. Names, phone and email always stay, so you can reply.",
      "Answers arrive in the Enquiries Sheet and by email. Use Quotes in the top menu to send a rough estimate.",
    ],
    note: "The Careers form stays a normal form, where everything shows at once.",
  },
  careerRole: {
    title: "Adding an open role",
    steps: ["The role's name, and a short description.", "It appears on the Careers page and in its form straight away.", "Hide it when the role is filled, so you can use it again later."],
  },
};

export const hasHelp = (type: string) => type in HELP;

/** A side drawer with the short version; the Guide and the film are one press away. */
export function HelpDrawer({ type, open, onClose }: { type: string; open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const help = HELP[type];

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  if (!help) return null;
  return (
    <dialog
      ref={dialog}
      className="st-help"
      aria-labelledby="st-help-title"
      onClose={onClose}
      // A press on the shaded page beside the drawer closes it.
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
    >
      <div className="st-help__sheet">
        <header>
          <p>How this works</p>
          <h2 id="st-help-title">{help.title}</h2>
          <button type="button" className="st-help__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        <ol>
          {help.steps.map((step, index) => (
            <li key={step} style={{ animationDelay: `${index * 70}ms` }}>
              <span aria-hidden="true">{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
        {help.note ? <p className="st-help__note">{help.note}</p> : null}
        <div className="st-help__more">
          <button type="button" onClick={() => router.navigate({ tool: "tutorials" })}>Watch the film</button>
          <button type="button" onClick={() => router.navigate({ tool: "guide" })}>Open the Guide</button>
        </div>
      </div>
    </dialog>
  );
}
