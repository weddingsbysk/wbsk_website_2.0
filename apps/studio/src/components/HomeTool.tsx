import { samplesStillShowing } from "@wbsk/content";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useClient, useCurrentUser, useRouter } from "./studio-hooks";

const API = "2026-11-01";
const SAMPLE_KINDS = ["wedding", "destination", "preWeddingShoot", "film", "review", "reactionVideo", "teamMember", "careerRole", "featuredOnItem"];

const panel: CSSProperties = { background: "#FFFDF9", borderRadius: 8, padding: 20, boxShadow: "0 1px 2px rgb(58 36 16 / 0.06), 0 8px 24px -12px rgb(58 36 16 / 0.14)" };
const label: CSSProperties = { fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7A5C17", margin: "0 0 12px" };
const serif = '"Bodoni Moda", "Times New Roman", serif';

const quick = [
  ["Add a wedding", "Names, three photos, gallery, films. Step by step.", "wedding"],
  ["Add a film", "YouTube link and poster, for the homepage or Films page.", "film"],
  ["Add a review", "Paste a couple's words, add stars, approve.", "review"],
  ["Add a pre-wedding shoot", "Pick its destination; its page fills itself.", "preWeddingShoot"],
  ["Change a cover video", "Homepage or Pre-wedding. Desktop, phone and two posters.", null],
  ["Update open roles", "Roles shown on Careers and in its form.", "careerRole"],
] as const;

type Row = { id: string; type: string; title: string; note: string };

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={panel}>
      <h2 style={label}>{title}</h2>
      {children}
    </section>
  );
}

export function HomeTool() {
  const client = useClient({ apiVersion: API });
  const user = useCurrentUser();
  const router = useRouter();
  const [waiting, setWaiting] = useState<Row[]>([]);
  const [worth, setWorth] = useState<{ text: string; intent?: [string, string] }[]>([]);
  const [last, setLast] = useState<{ title: string; at: string } | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      const data = await client.fetch<{
        drafts: { _id: string; _type: string; title?: string }[];
        unapproved: { _id: string; names?: string }[];
        empty: { _id: string; name?: string }[];
        items: { _type: string; _createdAt: string; isSample?: boolean }[];
        settings: { googleUpdated?: string; backupWhatsApp?: string; backupEmail?: string } | null;
        missing: number;
        last: { title?: string; _updatedAt: string } | null;
      }>(
        `{
          "drafts": *[_id in path("drafts.**") && _type in ["wedding","destination","preWeddingShoot","film"]]{_id,_type,"title":coalesce(name,names,firstName+" & "+secondName,"Untitled")}[0...6],
          "unapproved": *[_type=="review" && approved!=true]{_id,names}[0...6],
          "empty": *[_type=="destination" && !(_id in path("drafts.**")) && count(*[_type=="preWeddingShoot" && references(^._id) && hidden!=true && !(_id in path("drafts.**"))])==0]{_id,name}[0...6],
          "items": *[_type in $kinds && !(_id in path("drafts.**")) && hidden!=true]{_type,_createdAt,isSample},
          "settings": *[_id=="siteSettings"][0]{googleUpdated,backupWhatsApp,backupEmail},
          "missing": count(*[_id in path("drafts.**") && _type=="wedding"].gallery[!defined(description)]),
          "last": *[_type in $kinds && !(_id in path("drafts.**"))]|order(_updatedAt desc)[0]{"title":coalesce(name,names,title,firstName+" & "+secondName),_updatedAt}
        }`,
        { kinds: SAMPLE_KINDS },
      );
      if (!live) return;
      setWaiting([
        ...data.drafts.map((d) => ({ id: d._id.replace(/^drafts\./, ""), type: d._type, title: d.title ?? "Untitled", note: "Draft" })),
        ...data.unapproved.map((r) => ({ id: r._id.replace(/^drafts\./, ""), type: "review", title: `Review from ${r.names ?? "a couple"}`, note: "Needs approval" })),
        ...data.empty.map((d) => ({ id: d._id, type: "destination", title: d.name ?? "Destination", note: "Shows on the records once it has a shoot" })),
      ]);
      const notes: { text: string; intent?: [string, string] }[] = [];
      const updated = data.settings?.googleUpdated;
      if (!updated || Date.now() - new Date(updated).getTime() > 60 * 86400000) notes.push({ text: updated ? "Google rating not updated for 60+ days" : "Google rating not filled in", intent: ["siteSettings", "siteSettings"] });
      if (!data.settings?.backupWhatsApp) notes.push({ text: "Backup WhatsApp number is empty", intent: ["siteSettings", "siteSettings"] });
      if (!data.settings?.backupEmail) notes.push({ text: "Backup email is empty", intent: ["siteSettings", "siteSettings"] });
      if (data.missing) notes.push({ text: `${data.missing} gallery photos have no description` });
      const showing = SAMPLE_KINDS.reduce((sum, kind) => sum + samplesStillShowing(data.items.filter((i) => i._type === kind)), 0);
      if (showing) notes.push({ text: `Samples still showing: ${showing}` });
      setWorth(notes);
      setLast(data.last ? { title: data.last.title ?? "Item", at: data.last._updatedAt } : null);
    })();
    return () => {
      live = false;
    };
  }, [client]);

  const open = (type: string, id?: string) =>
    router.navigateIntent(id ? "edit" : "create", id ? { id, type } : { type });

  return (
    <div style={{ height: "100%", overflow: "auto", background: "#F5EFE6", color: "#231C16" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 24px 64px" }}>
        <h1 style={{ fontFamily: serif, fontWeight: 400, fontSize: 40, lineHeight: 1.1, margin: 0 }}>
          {greeting()}, {user?.name?.split(" ")[0] ?? "there"}
        </h1>
        <p style={{ margin: "8px 0 28px" }}>What would you like to do today?</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
          {quick.map(([title, text, type]) => (
            <button
              key={title}
              type="button"
              onClick={() => (type ? open(type) : open("homepage", "homepage"))}
              style={{ ...panel, border: 0, textAlign: "left", cursor: "pointer", color: "inherit", font: "inherit", minHeight: 44 }}
            >
              <span style={{ display: "block", fontFamily: serif, fontSize: 22, marginBottom: 6 }}>{title}</span>
              <span style={{ fontSize: 14, lineHeight: 1.5 }}>{text}</span>
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 16 }}>
          <Block title="Waiting for you">
            {waiting.length === 0 ? <p style={{ margin: 0 }}>Nothing waiting.</p> : null}
            {waiting.map((row) => (
              <button key={`${row.id}-${row.note}`} type="button" onClick={() => open(row.type, row.id)} style={{ display: "flex", justifyContent: "space-between", gap: 12, width: "100%", padding: "10px 0", border: 0, borderTop: "1px solid rgb(35 28 22 / 0.1)", background: "none", textAlign: "left", cursor: "pointer", color: "inherit", font: "inherit" }}>
                <span>{row.title}</span>
                <span style={{ fontSize: 13, color: "#7A5C17" }}>{row.note}</span>
              </button>
            ))}
          </Block>
          <Block title="Worth a look">
            {worth.length === 0 ? <p style={{ margin: 0 }}>All in order.</p> : null}
            {worth.map((note) => (
              <div key={note.text} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderTop: "1px solid rgb(35 28 22 / 0.1)" }}>
                <span>{note.text}</span>
                {note.intent ? (
                  <button type="button" onClick={() => open(note.intent![0], note.intent![1])} style={{ border: 0, background: "none", color: "#7A5C17", cursor: "pointer", font: "inherit", fontSize: 13 }}>
                    Fix
                  </button>
                ) : null}
              </div>
            ))}
          </Block>
        </div>
        <Block title="Last published">
          {last ? <p style={{ margin: 0 }}>{last.title} · {new Date(last.at).toLocaleString()}</p> : <p style={{ margin: 0 }}>Nothing published yet.</p>}
        </Block>
      </div>
    </div>
  );
}
