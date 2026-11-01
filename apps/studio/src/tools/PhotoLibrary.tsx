import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useClient } from "sanity";

type Asset = {
  _id: string;
  url: string;
  originalFilename?: string;
  size?: number;
  width?: number;
  height?: number;
  used: number;
};

const PAGE = 60;
const input: CSSProperties = { font: "inherit", padding: "10px 12px", border: "1px solid rgb(35 28 22 / 0.3)", borderRadius: 8, background: "#FFFDF9", minHeight: 44 };

/** Every uploaded photo, searchable, showing whether it's in use. Nothing can be deleted here. */
export function PhotoLibrary() {
  const client = useClient({ apiVersion: "2026-11-01" });
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [search, setSearch] = useState("");
  const [onlyUnused, setOnlyUnused] = useState(false);
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    let live = true;
    void client
      .fetch<Asset[]>(
        `*[_type == "sanity.imageAsset"] | order(_createdAt desc)[0...2000]{
          _id, url, originalFilename, size, "width": metadata.dimensions.width, "height": metadata.dimensions.height,
          "used": count(*[references(^._id)])
        }`,
      )
      .then((result) => live && setAssets(result));
    return () => {
      live = false;
    };
  }, [client]);

  const matching = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (assets ?? []).filter(
      (asset) => (!term || asset.originalFilename?.toLowerCase().includes(term)) && (!onlyUnused || asset.used === 0),
    );
  }, [assets, search, onlyUnused]);

  return (
    <div style={{ height: "100%", overflow: "auto", background: "#F5EFE6", color: "#231C16" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 64px" }}>
        <h1 style={{ fontFamily: '"Bodoni Moda", serif', fontWeight: 400, fontSize: 40, margin: "0 0 8px" }}>Photo library</h1>
        <p style={{ margin: "0 0 20px" }}>
          {assets ? `${assets.length} photos.` : "Loading…"} Add photos from inside a wedding or shoot, so each gets its description.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 20 }}>
          <input style={input} type="search" placeholder="Search by file name" aria-label="Search by file name" value={search} onChange={(event) => setSearch(event.target.value)} />
          <label style={{ display: "flex", gap: 8, alignItems: "center", minHeight: 44 }}>
            <input type="checkbox" checked={onlyUnused} onChange={(event) => setOnlyUnused(event.target.checked)} />
            Only photos not in use
          </label>
        </div>
        <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14, margin: 0, padding: 0, listStyle: "none" }}>
          {matching.slice(0, shown).map((asset) => (
            <li key={asset._id} style={{ background: "#FFFDF9", borderRadius: 8, overflow: "hidden" }}>
              <img src={`${asset.url}?w=340&h=240&fit=crop&auto=format`} alt="" loading="lazy" style={{ display: "block", width: "100%", aspectRatio: "17 / 12", objectFit: "cover" }} />
              <div style={{ padding: "8px 10px", fontSize: 12, lineHeight: 1.4 }}>
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asset.originalFilename ?? "Photo"}</div>
                <div style={{ color: "#6B5E50" }}>
                  {asset.width} × {asset.height} · {asset.used ? `Used in ${asset.used}` : "Not in use"}
                </div>
              </div>
            </li>
          ))}
        </ul>
        {matching.length > shown ? (
          <button type="button" style={{ ...input, marginTop: 20, cursor: "pointer" }} onClick={() => setShown(shown + PAGE)}>
            Show more
          </button>
        ) : null}
      </div>
    </div>
  );
}
