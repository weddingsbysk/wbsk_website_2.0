// Run once with: cd apps/studio && npx sanity exec ../../scripts/seed-album-photos.ts --with-user-token
// Gives each sample wedding the album's cover, bride and groom photos, leaving everything else as it is (Decision 25).
import sharp from "sharp";
import { getCliClient } from "sanity/cli";

const client = getCliClient({ apiVersion: "2026-11-01" });
const TONES = [["#8e6f54", "#3f3024"], ["#a58a70", "#54422f"], ["#6e5a4a", "#2c2219"], ["#b09473", "#5e4a36"]];

async function photo(owner: string, slot: string, tone: string[], width = 1600, height = 2000) {
  const label = `Sample: ${owner}, ${slot}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><radialGradient id="g" cx="50%" cy="38%" r="85%"><stop offset="0" stop-color="${tone[0]}"/><stop offset="1" stop-color="${tone[1]}"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="50%" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="56" fill="#F5EFE6" fill-opacity="0.7">${label}</text></svg>`;
  const buffer = await sharp(Buffer.from(svg)).jpeg({ quality: 70, mozjpeg: true }).toBuffer();
  const asset = await client.assets.upload("image", buffer, { filename: `sample-${owner.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${slot}.jpg` });
  return { _type: "image", asset: { _type: "reference", _ref: asset._id }, description: `Sample image standing in for the ${slot}.` };
}

const weddings = await client.fetch<{ _id: string; n: string }[]>(`*[_type == "wedding" && isSample == true && !defined(albumCover) && !(_id in path("drafts.**"))]{ _id, "n": _id }`);
const transaction = client.transaction();
for (const [i, wedding] of weddings.entries()) {
  const owner = `Wedding ${wedding.n.replace("sample-wedding-", "")}`;
  const tone = TONES[i % TONES.length]!;
  transaction.patch(wedding._id, {
    set: {
      albumCover: await photo(owner, "album cover", tone, 1200, 2800),
      bridePhoto: await photo(owner, "bride photo", tone),
      groomPhoto: await photo(owner, "groom photo", tone),
    },
  });
}
await transaction.commit();
console.log(`Gave ${weddings.length} sample weddings their album photos.`);
