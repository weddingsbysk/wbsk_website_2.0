import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useClient } from "sanity";
import { SearchLine } from "../components/icons";

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
    <div className="st-page">
      <div className="st-page__inner">
        <h1 className="st-title st-rise">Photo library</h1>
        <p className="st-lede st-rise">
          {assets ? `${assets.length} photos.` : "Loading…"} Add photos from inside a wedding or shoot, so each gets its description.
        </p>
        <div className="st-tools-row st-rise">
          <label className="st-search">
            <SearchLine />
            <input type="search" placeholder="Search by file name" aria-label="Search by file name" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <div className="st-segment" role="group" aria-label="Which photos">
            <button type="button" aria-pressed={!onlyUnused} onClick={() => setOnlyUnused(false)}>
              All photos
            </button>
            <button type="button" aria-pressed={onlyUnused} onClick={() => setOnlyUnused(true)}>
              Not in use
            </button>
          </div>
        </div>
        {assets && !matching.length ? <p className="st-lede">No photos match. Try another name.</p> : null}
        <ul className="st-photos">
          {matching.slice(0, shown).map((asset, index) => (
            <li key={asset._id} className="st-photo" style={{ "--i": Math.min(index, 24) } as CSSProperties}>
              <div>
                <img src={`${asset.url}?w=380&h=268&fit=crop&auto=format`} alt="" loading="lazy" />
              </div>
              <div className="st-photo__text">
                <b>{asset.originalFilename ?? "Photo"}</b>
                <small>
                  {asset.width} × {asset.height} · {asset.used ? `Used in ${asset.used}` : "Not in use"}
                </small>
              </div>
            </li>
          ))}
        </ul>
        {matching.length > shown ? (
          <button type="button" className="st-morebtn" onClick={() => setShown(shown + PAGE)}>
            Show more
          </button>
        ) : null}
      </div>
    </div>
  );
}
