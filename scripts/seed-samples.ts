// Run with: npm run seed (from the repository root). Decision 25: labelled samples only.
// Images are plain tones labelled "Sample" plus a slot name, never stock photos or real people.
// Safe to run again: uploads are matched by content, documents are replaced by their sample IDs.
import { execFileSync } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { getCliClient } from "sanity/cli";

const client = getCliClient({ apiVersion: "2026-11-01" });
const TEST_CLIP = "https://youtu.be/Uu6J7jDswug";

type Ref = { _type: "image"; asset: { _type: "reference"; _ref: string }; description: string };

const TONES = [["#8e6f54", "#3f3024"], ["#a58a70", "#54422f"], ["#6e5a4a", "#2c2219"], ["#b09473", "#5e4a36"], ["#7c6652", "#352a20"], ["#94795f", "#463627"]];
const tone = (i: number) => TONES[i % TONES.length]!;

async function pngOrJpeg(width: number, height: number, label: string, i: number, opts: { mono?: boolean; art?: boolean } = {}) {
  const size = Math.round(Math.min(width, height) * 0.035);
  const [from, to] = opts.mono ? ["#9b9b9b", "#2f2f2f"] : tone(i);
  const text = label.replace(/&/g, "&amp;");
  if (opts.art) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><g fill="#222"><circle cx="${width / 2}" cy="${height * 0.42}" r="${width * 0.2}"/><rect x="${width * 0.2}" y="${height * 0.62}" width="${width * 0.6}" height="${height * 0.06}"/></g><text x="50%" y="${height * 0.8}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${size}" fill="#222">${text}</text></svg>`;
    return { buffer: await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer(), ext: "png" };
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><radialGradient id="g" cx="${40 + (i % 5) * 6}%" cy="${35 + (i % 4) * 8}%" r="85%"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="50%" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${size}" fill="#F5EFE6" fill-opacity="0.8">${text}</text></svg>`;
  return { buffer: await sharp(Buffer.from(svg)).jpeg({ quality: 70, mozjpeg: true }).toBuffer(), ext: "jpg" };
}

let counter = 0;
async function image(width: number, height: number, slot: string, opts: { mono?: boolean; art?: boolean } = {}): Promise<Ref> {
  const i = counter++;
  const label = `Sample: ${slot}`;
  const { buffer, ext } = await pngOrJpeg(width, height, label, i, opts);
  const asset = await client.assets.upload("image", buffer, { filename: `sample-${slot.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${ext}` });
  return { _type: "image", asset: { _type: "reference", _ref: asset._id }, description: `Sample image standing in for the ${slot.toLowerCase()}.` };
}

async function many<T, R>(items: T[], run: (item: T, index: number) => Promise<R>, limit = 6): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await run(items[index]!, index);
      }
    }),
  );
  return results;
}

const gallery = (count: number, owner: string) =>
  many(Array.from({ length: count }), async (_, i) => {
    const landscape = i % 3 !== 1;
    const photo = await image(landscape ? 3000 : 2000, landscape ? 2000 : 3000, `${owner}, gallery ${i + 1}`);
    return { ...photo, _type: "galleryPhoto" as const, _key: `photo${i + 1}` };
  });

const filmLink = async (slot: string) => ({ _type: "filmLink" as const, url: TEST_CLIP, poster: await image(1920, 1080, `${slot} poster`) });

function testVideo(name: string, width: number, height: number): string {
  const dir = path.join(os.tmpdir(), "wbsk-sample-video");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.mp4`);
  if (!existsSync(file)) {
    execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", `gradients=s=${width}x${height}:c0=0x6b5442:c1=0x2c2219:c2=0x8e6f54:x0=0:y0=0:x1=${width}:y1=${height}:nb_colors=3:speed=0.004:d=90:r=24`, "-c:v", "libx264", "-preset", "medium", "-crf", "30", "-maxrate", "2500k", "-bufsize", "5000k", "-pix_fmt", "yuv420p", "-an", "-movflags", "+faststart", file]);
  }
  const mb = statSync(file).size / 1000 / 1000;
  if (mb >= 30) throw new Error(`${name} is ${mb} MB, over the 30 MB limit`);
  return file;
}

async function video(name: string, width: number, height: number) {
  const asset = await client.assets.upload("file", createReadStream(testVideo(name, width, height)), { filename: `sample-${name}.mp4`, contentType: "video/mp4" });
  return { _type: "file", asset: { _type: "reference", _ref: asset._id } };
}

const couples: [string, string, string, string, string, string][] = [
  ["Sample Asha", "Sample Kabir", "Destination", "Goa", "Sample Beach House", "2026-09-12"],
  ["Sample Mira", "Sample Dev", "Destination", "Udaipur", "Sample Lake Palace", "2026-06-20"],
  ["Sample Tara", "Sample Rohan", "Local", "Delhi", "Sample Farmhouse", "2026-03-07"],
  ["Sample Isha", "Sample Arnav", "Destination", "Jaipur", "Sample Haveli", "2025-12-14"],
  ["Sample Nina", "Sample Vir", "Destination", "Rishikesh", "Sample Riverside Camp", "2025-10-02"],
  ["Sample Zoya", "Sample Kian", "Local", "Gurugram", "Sample Courtyard", "2025-02-22"],
  // More samples for testing "Show more" and the moving row, with short and very long names.
  ["Sample Ira", "Sample Jo", "Local", "Noida", "Sample Terrace", "2025-01-18"],
  ["Sample Anoushka Venkataraghavan", "Sample Siddharth Chakraborty-Menon", "Destination", "Jaisalmer", "Sample Desert Camp and Fort Residency", "2024-12-09"],
  ["Sample Leela", "Sample Arjun", "Destination", "Kochi", "Sample Backwater Bungalow", "2024-11-22"],
  ["Sample Meher", "Sample Aarav", "Local", "Delhi", "Sample Lawn", "2024-10-05"],
  ["Sample Rhea Kothari", "Sample Vivaan Oberoi", "Destination", "Mussoorie", "Sample Hill Lodge", "2024-07-14"],
  ["Sample Sia", "Sample Om", "Destination", "Pushkar", "Sample Fort", "2024-04-27"],
  ["Sample Kiara Fernandes", "Sample Neel", "Local", "Faridabad", "Sample Garden", "2024-02-11"],
  ["Sample Avni", "Sample Reyansh Mukherjee", "Destination", "Coorg", "Sample Coffee Estate", "2023-12-16"],
  ["Sample Tanvi", "Sample Yash", "Destination", "Shimla", "Sample Old Hotel", "2023-11-03"],
  ["Sample Pari", "Sample Dhruv", "Local", "Gurugram", "Sample Rooftop", "2023-09-09"],
];

/** Which samples show on the homepage row, in order. */
const FEATURED = [1, 2, 3, 4, 7, 8, 9, 10];
/** The six original samples are complete; the rest only need enough photos to open properly. */
const galleryCount = (i: number) => (i === 0 ? 60 : i < 6 ? 20 : 8);

const STORY = (a: string, b: string, city: string) =>
  `This is sample wording, standing in for a real couple's story. ${a} and ${b} wanted a wedding that felt like them, with family close and nobody hurrying anyone along. So we stayed quiet, kept near, and let ${city} do what it does at the end of a long day. Their first look happened on a stairwell nobody had planned for. By the sangeet, we'd stopped being the people with the cameras. The real story is written in WBSK Studio.`;

const docs: Record<string, unknown>[] = [];
const add = (doc: Record<string, unknown>) => docs.push(doc);

const destinations = [
  ["Goa", "goa"], ["Udaipur", "udaipur"], ["Rishikesh", "rishikesh"], ["UAE", "uae"], ["Thailand", "thailand"], ["Europe", "europe"],
];

const wedQ = (key: string, label: string, kind: string, extra: Record<string, unknown> = {}, i = 0) => ({ _type: "formQuestion", _key: key, key, label, kind, shown: true, required: false, ...extra, order: i });
const CONSENT = "We'll use your names, contact details and wedding details only to reply to your enquiry and plan your wedding with you. Privacy policy · you can ask us to delete them any time. I agree.";

/** Adds only the extra samples and the homepage's order, leaving every other document as it stands. */
async function addExtraWeddings() {
  const extra = couples.map((couple, i) => ({ couple, i })).slice(6);
  await many(extra, async ({ couple: [first, second, label, city, venue, date], i }) => {
    const n = i + 1;
    const owner = `Wedding ${n}`;
    await client.createOrReplace({
      _id: `sample-wedding-${n}`, _type: "wedding", isSample: true,
      firstName: first, secondName: second, placeLabel: label, city, venue, weddingDate: date,
      address: { _type: "slug", current: `${first} ${second}`.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
      cardPhoto: await image(1600, 2000, `${owner}, card photo`),
      coverDesktop: await image(3000, 1286, `${owner}, desktop cover`),
      coverPhone: await image(1500, 2000, `${owner}, phone cover`),
      gallery: await gallery(galleryCount(i), owner),
      shortDescription: `Sample wording: a ${label === "Destination" ? "destination wedding" : "wedding at home"} in ${city}, told slowly, with family close.`,
      theirStory: STORY(first, second, city),
      teaser: await filmLink(`${owner}, teaser`),
      highlight: await filmLink(`${owner}, highlight`),
      reels: [{ _type: "reel", _key: "reel1", url: "https://www.instagram.com/reel/SampleReel1/", label: "Sangeet" }],
      featured: FEATURED.includes(n), status: "live",
    });
  }, 2);
  await client
    .patch("homepage")
    .set({ featuredWeddings: FEATURED.map((n) => ({ _type: "reference", _key: `w${n}`, _ref: `sample-wedding-${n}` })) })
    .commit();
  console.log(`Done: ${extra.length} extra weddings, ${counter} images.`);
}

/** The old site's look (owner, 2 November 2026): only these fields change, nothing else is touched. */
async function addOldLookFields() {
  const titles = ["Evening", "Lakeside", "Courtyard", "Haveli", "Riverside", "Homecoming", "Terrace", "Desert", "Backwater", "Lawn", "Hilltop", "Fort", "Garden", "Estate", "Old Hotel", "Rooftop"];
  const tx = client.transaction();
  titles.forEach((title, i) => tx.patch(`sample-wedding-${i + 1}`, { set: { storyTitle: `Sample ${title} Story` } }));
  tx.patch("homepage", {
    set: {
      whoWeAre: "We don't just photograph weddings. We preserve the feeling of them.",
      quoteEmphasis: "feeling",
      quoteBy: "Siddhant Kapoor · Lead Photographer",
      weddingsLine: "Each wedding is a unique story waiting to be told.",
      counters: [
        { _type: "counter", _key: "a", value: "9+", label: "Years of craft (sample)" },
        { _type: "counter", _key: "b", value: "500+", label: "Stories told (sample)" },
      ],
    },
  });
  await tx.commit();
  console.log("Done: old-look fields added.");
}

async function main() {
  if (process.env.SEED_ONLY === "extra-weddings") return addExtraWeddings();
  if (process.env.SEED_ONLY === "old-look") return addOldLookFields();
  console.log("Uploading sample weddings…");
  await many(couples, async ([first, second, label, city, venue, date], i) => {
    const n = i + 1;
    const owner = `Wedding ${n}`;
    add({
      _id: `sample-wedding-${n}`, _type: "wedding", isSample: true,
      firstName: first, secondName: second, placeLabel: label, city, venue, weddingDate: date,
      address: { _type: "slug", current: `${first} ${second}`.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
      cardPhoto: await image(1600, 2000, `${owner}, card photo`),
      coverDesktop: await image(3000, 1286, `${owner}, desktop cover`),
      coverPhone: await image(1500, 2000, `${owner}, phone cover`),
      gallery: await gallery(galleryCount(i), owner),
      shortDescription: `Sample wording: a ${label === "Destination" ? "destination wedding" : "wedding at home"} in ${city}, told slowly, with family close.`,
      theirStory: STORY(first, second, city),
      teaser: await filmLink(`${owner}, teaser`),
      highlight: await filmLink(`${owner}, highlight`),
      reels: [{ _type: "reel", _key: "reel1", url: "https://www.instagram.com/reel/SampleReel1/", label: "Sangeet" }],
      featured: FEATURED.includes(n), status: "live",
    });
  }, 2);

  console.log("Uploading sample destinations and shoots…");
  await many(destinations, async ([name, slug], i) => {
    const n = i + 1;
    add({
      _id: `sample-destination-${n}`, _type: "destination", isSample: true,
      name: `Sample ${name}`, address: { _type: "slug", current: `sample-${slug}` },
      catalogueNumber: `S${String(n).padStart(2, "0")}`,
      artwork: await image(1600, 1600, `${name}, sleeve artwork`, { art: true }),
      coverDesktop: await image(3000, 1286, `${name}, desktop cover`),
      coverPhone: await image(1500, 2000, `${name}, phone cover`),
      order: n, status: "live", hidden: false,
    });
    for (const [s, kind] of [[1, "Full-length"], [2, "Concept"]] as const) {
      add({
        _id: `sample-shoot-${n}-${s}`, _type: "preWeddingShoot", isSample: true,
        names: `Sample Couple ${n}${s === 1 ? "A" : "B"}`,
        shortDescription: `Sample wording: a ${kind.toLowerCase()} shoot in ${name}, for two people who'd rather walk than pose.`,
        destinations: [{ _type: "reference", _key: "d", _ref: `sample-destination-${n}` }],
        kind, monthYear: "2026-02-01", location: `Sample location, ${name}`,
        films: [{ ...(await filmLink(`${name} shoot ${s}, film`)), _key: "film1" }],
        photos: await gallery(6, `${name} shoot ${s}`),
        hidden: false,
      });
    }
  }, 2);

  console.log("Uploading films, team, reviews and page settings…");
  const kinds = ["Highlight", "Teaser", "Wedding film", "Highlight", "Pre-wedding", "Wedding film", "Teaser", "Highlight"];
  await many(kinds, async (kind, i) => {
    add({
      _id: `sample-film-${i + 1}`, _type: "film", isSample: true, url: TEST_CLIP,
      poster: await image(1920, 1080, `Film ${i + 1} poster`),
      names: i < 6 ? `${couples[i]![0]} & ${couples[i]![1]}` : `Sample Couple ${i + 1}`,
      place: i < 6 ? couples[i]![3] : "Sample place", kind,
      line: "Sample wording: the film they play for each other on the quiet evenings.",
      linked: i < 4 ? { _type: "reference", _ref: `sample-wedding-${i + 1}` } : undefined,
      featured: i < 5, showOnFilmsPage: true, order: i + 1, hidden: false,
    });
  });
  const roles = ["Founder · Director", "Lead photographer", "Lead filmmaker", "Second photographer", "Film editor", "Photo editor"];
  await many(roles, async (role, i) => {
    add({
      _id: `sample-team-${i + 1}`, _type: "teamMember", isSample: true,
      name: i === 0 ? "Sample Director" : `Sample Crew ${i}`, role,
      portrait: await image(1600, 2000, `Team portrait ${i + 1}`, { mono: true }),
      lines: "Sample wording: a few lines in their own words about why they do this, and what they notice first.",
      order: i + 1, hidden: false,
    });
  });
  await many(Array.from({ length: 5 }), async (_, i) => {
    add({
      _id: `sample-reaction-${i + 1}`, _type: "reactionVideo", isSample: true, url: TEST_CLIP,
      poster: await image(1080, 1920, `Reaction ${i + 1} poster`),
      names: `${couples[i]![0]} & ${couples[i]![1]}`, place: couples[i]![3],
      linked: { _type: "reference", _ref: `sample-wedding-${i + 1}` }, featured: true, order: i + 1, hidden: false,
    });
  });
  for (let i = 0; i < 6; i += 1) {
    add({
      _id: `sample-review-${i + 1}`, _type: "review", isSample: true,
      names: `${couples[i]![0]} & ${couples[i]![1]}`, place: couples[i]![3],
      text: "This is a sample review, standing in for a couple's own words. By the second day we'd stopped noticing the cameras. They knew when to step in and when to disappear, and when the film came, we watched it three times before either of us said anything. It felt like being looked after by friends who happened to be very good at this.",
      highlight: i % 2 === 0 ? "Sample line: they knew when to step in and when to disappear." : undefined,
      rating: 5, reviewDate: couples[i]![5], linked: { _type: "reference", _ref: `sample-wedding-${i + 1}` },
      approved: true, order: i + 1, hidden: false,
    });
  }
  ["Sample Lead Photographer", "Sample Lead Filmmaker"].forEach((title, i) => add({ _id: `sample-role-${i + 1}`, _type: "careerRole", isSample: true, title, description: "Sample wording: what this role looks like across a wedding season.", order: i + 1, hidden: false }));
  await many(["Sample Magazine", "Sample Award", "Sample Journal"], async (name, i) => {
    add({ _id: `sample-featured-${i + 1}`, _type: "featuredOnItem", isSample: true, name, image: await image(1200, 800, `Featured on, ${name}`), link: "https://example.com/", order: i + 1, hidden: false });
  });

  [["Basic", "Your wedding, beautifully told."], ["Premium", "The full story, on film."], ["Signature", "Directed by Siddhant himself."]].forEach(([name, line], i) =>
    add({ _id: `package-${String(name).toLowerCase()}`, _type: "weddingPackage", name, line, order: i + 1 }));

  add({
    _id: "homepage", _type: "homepage",
    heroVideoDesktop: await video("hero-desktop", 1920, 1080), heroVideoPhone: await video("hero-phone", 1080, 1920),
    heroPosterDesktop: await image(2560, 1440, "Hero poster, desktop"), heroPosterPhone: await image(1350, 2400, "Hero poster, phone"),
    heroLine: "Your wedding, the way it felt.",
    whoWeAre: "Sample wording. We make wedding films and photographs that feel like your own story, and we stay close enough along the way that you stop thinking of us as the people with the cameras.",
    counters: [{ _type: "counter", _key: "a", value: "100+", label: "Stories covered (sample)" }, { _type: "counter", _key: "b", value: "10", label: "Years of craft (sample)" }],
    featuredWeddings: FEATURED.map((n) => ({ _type: "reference", _key: `w${n}`, _ref: `sample-wedding-${n}` })),
    featuredFilms: [1, 2, 3, 4, 5].map((n) => ({ _type: "reference", _key: `f${n}`, _ref: `sample-film-${n}` })),
    teamPhoto: await image(3000, 1286, "Team photo"), teamLine: "The people behind your story", showFeaturedOn: true,
  });
  add({ _id: "weddingsPage", _type: "weddingsPage", intro: "Sample wording: every wedding here belongs to two people who trusted us with the quiet parts too." });
  add({ _id: "filmsPage", _type: "filmsPage", intro: "Sample wording: pull up a chair. These play with the sound on, when you're ready." });
  add({ _id: "teamPage", _type: "teamPage", studioLine: "Sample wording: the people you'll forget are working." });
  add({ _id: "careersPage", _type: "careersPage", intro: "Sample wording: if you notice the small things at a big wedding, come and talk to us." });
  add({
    _id: "preWeddingPage", _type: "preWeddingPage",
    coverVideoDesktop: await video("cover-desktop", 1920, 1080), coverVideoPhone: await video("cover-phone", 1080, 1920),
    coverPosterDesktop: await image(2560, 1440, "Pre-wedding cover poster, desktop"), coverPosterPhone: await image(1350, 2400, "Pre-wedding cover poster, phone"),
    credit: "Sample Couple · Udaipur",
    fullLength: {
      name: "Full-length", description: "A 3–4 minute pre-wedding film mixing the whole shoot, one mix reel, and edited photographs.",
      films: await many([1, 2], async (n) => ({ ...(await filmLink(`Full-length example ${n}`)), _key: `film${n}` })),
      gallery: await gallery(12, "Full-length example"),
    },
    concept: {
      name: "Concept", description: "A separate 1–1:30 minute film for each place shot, plus one mix reel and edited photographs.",
      films: await many([1, 2], async (n) => ({ ...(await filmLink(`Concept example ${n}`)), _key: `film${n}` })),
      gallery: await gallery(12, "Concept example"),
    },
  });
  add({ _id: "siteSettings", _type: "siteSettings", siteName: "WBSK", defaultDescription: "Wedding films and photographs by Weddings By Siddhant Kapoor.", instagram: "https://www.instagram.com/weddingsbysiddhantkapoor" });

  // The three forms' default questions (Decisions 14, 15, 16).
  const locked = { locked: true, required: true };
  add({
    _id: "formWedding", _type: "enquiryForm", title: "Wedding form", heading: "Tell us about your wedding", button: "Send your enquiry →",
    questions: [
      wedQ("names", "Your names", "text", { ...locked, example: "Meera & Arjun" }),
      wedQ("date", "Wedding date", "text", { required: true, example: "February 2027" }),
      wedQ("place", "City or venue", "text", { required: true, example: "Udaipur" }),
      wedQ("weddingType", "Wedding type", "one", { choices: ["Destination", "In my city"] }),
      wedQ("phone", "Phone (WhatsApp)", "phone", { locked: true, example: "+91 98765 43210" }),
      wedQ("email", "Email", "email", { locked: true, example: "meera@example.com" }),
      wedQ("events", "Which events?", "many", { choices: ["Haldi", "Mehendi", "Sangeet", "Cocktail", "Wedding", "Reception", "Something else"] }),
      wedQ("days", "How many days?", "one", { choices: ["1", "2", "3", "4+"] }),
      wedQ("guests", "Roughly how many guests?", "one", { choices: ["Under 100", "100–250", "250–500", "500+"] }),
      wedQ("coverage", "What would you like?", "one", { choices: ["Photographs and film", "Photographs only", "Film only"] }),
      wedQ("message", "Anything you'd like us to know", "long", { example: "Two days, about 200 guests, a sunset pheras…" }),
    ],
    nextSteps: ["We reply within a day.", "A call to hear your story.", "A plan made for your wedding."],
    thankYouHeading: "Thank you, [names]. We can't wait to hear your story.",
    thankYouText: "We reply within a day, on WhatsApp or email. A copy of your details is on its way to your inbox.",
    consent: CONSENT,
    confirmationEmail: "Thank you for telling us about your wedding. We reply within a day. Here's a copy of what you sent us.",
  });
  add({
    _id: "formPreWedding", _type: "enquiryForm", title: "Pre-wedding form", heading: "Plan your pre-wedding", button: "Send your enquiry →",
    questions: [
      wedQ("names", "Your names", "text", { ...locked, example: "Meera & Arjun" }),
      wedQ("date", "When are you thinking?", "text", { required: true, example: "December 2026" }),
      wedQ("place", "Where would you like to shoot?", "text", { required: true, example: "Santorini, Udaipur, the hills…" }),
      wedQ("coverage", "What would you like?", "one", { choices: ["Full-length", "Concept"] }),
      wedQ("phone", "Phone (WhatsApp)", "phone", { locked: true }),
      wedQ("email", "Email", "email", { locked: true }),
      wedQ("message", "Anything you'd like us to know", "long", { example: "A sunrise shoot, our dog, our first-date café…" }),
    ],
    nextSteps: ["We reply within a day.", "A call about your ideas.", "A shoot planned around you."],
    thankYouHeading: "Thank you, [names]. We can't wait to plan your shoot.",
    thankYouText: "We reply within a day, on WhatsApp or email. A copy of your details is on its way to your inbox.",
    consent: CONSENT,
    confirmationEmail: "Thank you for telling us about your shoot. We reply within a day. Here's a copy of what you sent us.",
  });
  add({
    _id: "formCareers", _type: "enquiryForm", title: "Careers form", heading: "Be part of WBSK", button: "Send your application →",
    questions: [
      wedQ("name", "Your name", "text", { ...locked }),
      wedQ("role", "Role you're applying for", "role", { required: true }),
      wedQ("experience", "Years of experience", "one", { required: true, choices: ["Under 1", "1–3", "3–5", "5+"] }),
      wedQ("portfolio", "Portfolio link", "url", { required: true, example: "instagram.com/yourwork or a drive link" }),
      wedQ("phone", "Phone", "phone", { ...locked }),
      wedQ("email", "Email", "email", { ...locked }),
    ],
    nextSteps: ["We look at every portfolio.", "If it's a fit, we'll call you.", "A trial shoot or edit, then we decide together."],
    thankYouHeading: "Thank you, [names]. We've got your application.",
    thankYouText: "We look at every portfolio.",
    consent: "I agree to WBSK keeping my details to consider my application, as in the privacy policy.",
    confirmationEmail: "Thank you for your application. We look at every portfolio.",
  });

  // References need their targets first, so destinations and weddings go in before anything else.
  const rank = (d: Record<string, unknown>) => (["wedding", "destination"].includes(String(d._type)) ? 0 : 1);
  const sorted = docs.sort((a, b) => rank(a) - rank(b));
  console.log(`Writing ${sorted.length} documents…`);
  for (let i = 0; i < sorted.length; i += 20) {
    const tx = client.transaction();
    for (const doc of sorted.slice(i, i + 20)) {
      const clean = JSON.parse(JSON.stringify(doc)) as Record<string, unknown> & { _id: string; _type: string };
      if (Array.isArray(clean.questions)) (clean.questions as Record<string, unknown>[]).forEach((q) => delete q.order);
      tx.createOrReplace(clean);
    }
    await tx.commit({ visibility: "async" });
  }
  console.log(`Done: ${sorted.length} documents, ${counter} images.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
