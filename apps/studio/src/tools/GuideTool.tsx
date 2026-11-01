import { Fragment, useState, type ReactNode } from "react";
import coverVideo from "../guides/Cover-Video-Export-Guide.md?raw";
import photos from "../guides/WBSK-Photo-Export-Guide-Lightroom.md?raw";
import studio from "../guides/Using-WBSK-Studio.md?raw";

const GUIDES = [
  { title: "Using WBSK Studio", text: studio },
  { title: "Photo export (Lightroom)", text: photos },
  { title: "Cover video export", text: coverVideo },
];

function inline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`)/).map((part, index) => {
    if (part.startsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) return <Fragment key={index}>{link[1]}</Fragment>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

/** A small reader for the guides' plain headings, lists and tables; no outside package needed. */
function Guide({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index]!;
    const key = index;
    if (/^#{1,4} /.test(line)) {
      const level = line.match(/^#+/)![0].length;
      const size = [40, 28, 20, 17][level - 1];
      out.push(
        <p key={key} role="heading" aria-level={level} style={{ fontFamily: level < 3 ? '"Bodoni Moda", serif' : undefined, fontWeight: level < 3 ? 400 : 600, fontSize: size, lineHeight: 1.15, margin: "28px 0 10px" }}>
          {inline(line.replace(/^#+ /, ""))}
        </p>,
      );
      index += 1;
    } else if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (lines[index]?.startsWith("|")) {
        if (!/^\|[\s:|-]+\|$/.test(lines[index]!)) rows.push(lines[index]!.split("|").slice(1, -1).map((cell) => cell.trim()));
        index += 1;
      }
      out.push(
        <div key={key} style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", margin: "12px 0", fontSize: 14 }}>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} style={{ padding: "8px 12px", borderBottom: "1px solid rgb(35 28 22 / 0.15)", fontWeight: rowIndex === 0 ? 600 : 400 }}>
                      {inline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    } else if (/^\s*([-*]|\d+\.) /.test(line)) {
      const items: string[] = [];
      while (lines[index] && /^\s*([-*]|\d+\.) /.test(lines[index]!)) {
        items.push(lines[index]!.replace(/^\s*([-*]|\d+\.) /, ""));
        index += 1;
      }
      out.push(
        <ul key={key} style={{ margin: "8px 0", paddingLeft: 22, display: "grid", gap: 6 }}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{inline(item)}</li>
          ))}
        </ul>,
      );
    } else if (line.trim() && !line.startsWith("---") && !line.startsWith(">")) {
      out.push(
        <p key={key} style={{ margin: "8px 0" }}>
          {inline(line)}
        </p>,
      );
      index += 1;
    } else if (line.startsWith(">")) {
      out.push(
        <p key={key} style={{ margin: "8px 0", color: "#6B5E50" }}>
          {inline(line.replace(/^>\s*/, ""))}
        </p>,
      );
      index += 1;
    } else {
      index += 1;
    }
  }
  return <>{out}</>;
}

/** The manager's guides, inside the Studio (Decisions 17 and 23). */
export function GuideTool() {
  const [current, setCurrent] = useState(0);
  return (
    <div style={{ height: "100%", overflow: "auto", background: "#F5EFE6", color: "#231C16", lineHeight: 1.6 }}>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 24px 64px" }}>
        <div role="tablist" aria-label="Guides" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {GUIDES.map((guide, index) => (
            <button
              key={guide.title}
              type="button"
              role="tab"
              aria-selected={index === current}
              onClick={() => setCurrent(index)}
              style={{ minHeight: 44, padding: "0 14px", font: "inherit", cursor: "pointer", borderRadius: 8, border: "1px solid #7A5C17", color: index === current ? "#FFFDF9" : "#231C16", background: index === current ? "#7A5C17" : "transparent" }}
            >
              {guide.title}
            </button>
          ))}
        </div>
        <Guide text={GUIDES[current]!.text} />
      </div>
    </div>
  );
}
