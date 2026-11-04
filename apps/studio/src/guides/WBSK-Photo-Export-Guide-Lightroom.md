# WBSK Photo Export Guide (Lightroom)

Oct 31, 2026 · @Siddhant

Export every website photo as an sRGB JPEG at quality 88, sized to its slot below. This guide is for whoever prepares photos for WBSK Studio.

**Status: approved** 31 October 2026 (Decision 06, Area 6b, and the two-poster hero change in Decision 04). Updated 3 November 2026 for the homepage album. Menu names are from Lightroom Classic and may differ slightly between versions.

## Crop ratios

Each wedding needs six required photos and its gallery: the album cover, the bride and groom pages, the card, and the two page covers. Crop these, and any posters, to their exact ratio in Lightroom; leave gallery photos uncropped unless the edit calls for it.

| Slot | Ratio | Orientation | Lightroom crop setting | Where it appears |
| --- | --- | --- | --- | --- |
| Album cover | 3:7 | Tall portrait | Enter Custom… 3 x 7 | Front of the homepage album |
| Bride photo, Groom photo | 4:5 | Portrait | 4 x 5 / 8 x 10 | The left and right pages inside the homepage album |
| Card photo | 4:5 | Portrait | 4 x 5 / 8 x 10 | Card on the Weddings page |
| Desktop cover | 21:9 | Landscape | Enter Custom… 21 x 9 | Top of the couple's page on computers; Weddings page lead story |
| Mobile cover | 3:4 | Portrait | 4 x 3, then press X to turn it portrait | Top of the couple's page on phones |
| Gallery photo | Original | Any | Original (no forced ratio) | Masonry gallery and full-screen view |
| Teaser and highlight posters | 16:9 | Landscape | 16 x 9 | Video cards before play |

**How to crop:** press R for the Crop tool, choose the ratio from the Aspect menu (the padlock must be closed), drag to frame, press Enter. Press X to swap between landscape and portrait.

**Framing tips**

- **Covers:** the ivory name label covers the bottom-left corner of the cover, so keep faces and key details away from the lower-left area.
- **Desktop cover (21:9):** a very wide frame. Wide venue, landscape or couple-in-scene shots work best; tight portraits lose heads or feet.
- **Album cover (3:7):** a tall frame, so a full-length couple works best. See The homepage album below.
- **Bride photo and groom photo (4:5):** a matching pair of portraits, one on each page of the open album. See The homepage album below.
- **Card photo (4:5):** one clear, emotional moment; it is seen small, so avoid busy group shots.
- The Studio still asks for a focal point on every image. It fine-tunes the crop at each screen size.

## The homepage album

On the homepage every wedding is shown as a modern photo album, moving slowly along a dark table. It has three photos of its own, and each one has a job.

**1. The cover (3:7, tall and narrow).** The closed album is white paper on the left, with the couple's names in large thin capitals, and your photo on the right, running from the top edge to the bottom edge and out to the side.

- **Choose a full-length or three-quarter photo of the two of them.** A standing couple fills this tall frame well; a wide scene does not.
- **Fill the frame with the couple.** The album is small on screen, about 130 px wide for the photo on a computer, so faces should be easy to read at that size.
- **Quiet backgrounds work best.** A simple or dark background looks strongest beside the white paper.
- **Don't add anything to the photo.** The names, place and date are set by the website, on the paper beside it, so no text or logo goes on the image.
- **Crop it on purpose.** Crop to 3 x 7 in Lightroom yourself, then set the focal point in the Studio. It fine-tunes the crop if a screen needs it.

**2. The left page: the bride (4:5).** One portrait of her. When the album opens, it fills most of the left page, with her name under it.

**3. The right page: the groom (4:5).** One portrait of him, on the right page, with his name under it.

**Making the two pages a pair:** they are seen side by side, so treat them as one picture.

- Use the same framing for both, such as both head and shoulders or both half-length.
- Use the same grade and a similar brightness, ideally from the same part of the day.
- Have them face the middle of the album, so she looks to the right and he looks to the left. Facing outwards looks as if they have turned away from each other.
- Keep faces away from the very edge next to the fold, where the page curves into a soft shadow.
- Export both in full colour or both in black and white, never one of each.

The album opens to these two pages only. Nothing else turns, so these are the two photographs a visitor sees before choosing to open the couple's story.

## Export settings (Lightroom Classic)

Select the photos, then File > Export. Set each panel as below; only the long-edge size changes between slots.

| Export panel | Setting | Why |
| --- | --- | --- |
| Export To | Hard Drive, a folder named after the couple | Keeps each wedding together |
| File Naming | Custom: couple-slot-number, e.g. `anusha-rohit-gallery-001` | Easy to find and keeps gallery order |
| Image Format | JPEG | The website converts it to modern formats automatically |
| Quality | 88 (anywhere 85–90 is fine) | Sharp, with sensible file sizes |
| Color Space | sRGB | Colours look right in every browser; other spaces look dull or shifted |
| Limit File Size | Off | Size is controlled by dimensions instead |
| Resize to Fit | Long Edge, size from the next section | One rule for portrait and landscape |
| Don't Enlarge | On | Never upscale a small photo; the Studio flags it instead |
| Resolution | 72 pixels per inch | Has no effect on screens |
| Output Sharpening | On: Sharpen for Screen, Amount Standard | Restores crispness after resizing |
| Metadata | Copyright & Contact Info Only, with Remove Person Info and Remove Location Info ticked | Protects couples' privacy; no GPS locations on the web |
| Watermark | Off | The website adds the WBSK logo in the full-screen view |
| Post-Processing | Do nothing | — |

Before the first export, add WBSK's copyright line under Metadata > Copyright in the Library module, so every file carries it.

## Sizes per slot and presets

Export at the recommended long edge. The minimum is the smallest size WBSK Studio accepts without a problem.

| Slot | Ratio | Long edge to export | Result | Minimum accepted | Approx. file size |
| --- | --- | --- | --- | --- | --- |
| Album cover | 3:7 | 2800 px | 1200 × 2800 | 900 × 2100 | 0.6–1.2 MB |
| Bride photo, Groom photo | 4:5 | 2000 px | 1600 × 2000 | 1600 × 2000 | 0.8–1.5 MB |
| Card photo | 4:5 | 2000 px | 1600 × 2000 | 1600 × 2000 | 0.8–1.5 MB |
| Desktop cover | 21:9 | 3000 px | 3000 × 1286 | 2560 px wide | 1–2 MB |
| Mobile cover | 3:4 | 2000 px | 1500 × 2000 | 1500 × 2000 | 0.8–1.5 MB |
| Gallery photo | Original | 3000 px | e.g. 3000 × 2000 | 2560 px long edge | 1.5–3 MB |
| Teaser and highlight posters | 16:9 | 1920 px | 1920 × 1080 | 1920 × 1080 | 0.5–1 MB |

File sizes are estimates and vary with detail and noise.

**What the Studio does with a too-small photo**: album photos, card photos and covers below the minimum are refused with a friendly message; a smaller gallery photo shows a warning but can still be added.

**Save nine presets** so nobody retypes settings. Set up the Export panel once, change only Resize to Fit, then click Add (bottom left) for each:

1. WBSK – Album cover 3x7 (2800)
2. WBSK – Card 4x5 (2000), also for the bride and groom pages
3. WBSK – Desktop cover 21x9 (3000)
4. WBSK – Mobile cover 3x4 (2000)
5. WBSK – Gallery (3000)
6. WBSK – Poster 16x9 (1920)
7. WBSK – Hero poster desktop 16x9 (2560)
8. WBSK – Hero poster mobile 9x16 (2400)
9. WBSK – Team portrait B&W 4x5 (2000)

## Homepage fallback images and client card photos

The homepage hero needs still images that show instantly while the video starts, and instead of the video on data-saver, slow connections or reduced motion. Make each poster match the first frame of its hero video so the change from still to motion is seamless.

| Image | Ratio | Lightroom crop | Long edge to export | Result | Minimum accepted |
| --- | --- | --- | --- | --- | --- |
| Hero poster, desktop | 16:9 landscape | 16 x 9 | 2560 px | 2560 × 1440 | 1920 × 1080 |
| Hero poster, mobile | 9:16 portrait | 16 x 9, then press X | 2400 px | 1350 × 2400 | 1080 × 1920 |
| Client card photo | 4:5 portrait | 4 x 5 / 8 x 10 | 2000 px | 1600 × 2000 | 1600 × 2000 |

**Hero posters**

- Taking the poster from the video: in the video editor, export the first frame as a still (PNG or high-quality JPEG), open it in Lightroom, crop if needed, and export with the settings above.
- Use the same colour grade as the video, so the switch is invisible.
- The hero is full screen and dark, and the logo sits over it: choose a calm frame, avoid bright clutter in the centre-top where the logo appears.
- Keep it light on detail and noise; it is the first thing every visitor downloads.

**Client card photos**

- One card photo per wedding, shown on the Weddings page. It is a separate image from the album cover and the page covers, though it can be the same moment cropped differently.
- Cards are seen small (roughly 260–400px wide on screen), so choose one clear, emotional moment with the couple large in the frame.
- On desktop the photo zooms gently inside its frame on hover, trimming a little off every edge: leave some breathing room around faces and hands.
- Nothing is printed over the card photo; names and place sit in the caption below, so the whole frame is visible.
- Keep the set consistent in grade and brightness, since many cards sit side by side.

## Team portraits and team photo

Team portraits for the Our team page are exported in stylized black and white at 4:5; the website shows them exactly as uploaded and never converts colour photos.

| Image | Ratio | Lightroom crop | Long edge to export | Result | Minimum accepted |
| --- | --- | --- | --- | --- | --- |
| Team portrait (B&W) | 4:5 portrait | 4 x 5 / 8 x 10 | 2000 px | 1600 × 2000 | 1600 × 2000 |
| Homepage team photo | 21:9 landscape | Enter Custom… 21 x 9 | 3000 px | 3000 × 1286 | 2560 px wide |

- **B&W look:** convert in the Develop module (Black & White treatment), then set contrast and grain to WBSK's chosen style. Use the same settings for every person, so the page looks like one series; save them as a Develop preset, e.g. "WBSK Team B&W".
- **Siddhant:** holding a camera; he is shown larger, so make sure the photo is sharp at full size.
- **Framing:** head and shoulders or half-length, with some dark space around the person; the page adds a soft spotlight behind each portrait.
- **Homepage team photo:** colour or black and white is still to be confirmed.

## Reviews

Written reviews have no photo; the couple's name identifies them.

## Pre-wedding

Pre-wedding work has no cards: it's shown through destination records and destination pages.

| Image | Ratio | Format | Minimum accepted |
| --- | --- | --- | --- |
| Destination artwork | Square | B&W PNG with transparency | 1600 × 1600 |
| Destination desktop cover | 21:9 landscape | JPEG, settings above | 2560 px wide |
| Destination mobile cover | 3:4 portrait | JPEG, settings above | 1500 × 2000 |
| Pre-wedding cover posters | 16:9 and 9:16 | JPEG, same as the hero posters | 1920 × 1080 and 1080 × 1920 |
| Shoot film posters | 16:9 landscape | JPEG, settings above | 1920 × 1080 |

## Lightroom (cloud and mobile) quick version

The same rules apply in the Lightroom app; only the menus differ.

1. Crop: open Crop, pick the ratio (4 x 5, 16 x 9, 4 x 3 turned portrait, or Custom 21 x 9 or 3 x 7).
2. Share or Export > Custom settings.
3. File type JPG, quality 88, dimensions Custom with the long edge from the table above.
4. Colour space sRGB.
5. Metadata: copyright only; switch off Include Location Info.
6. Watermark off; output sharpening Screen, Standard, if shown.

## Before you upload

Run through this for each wedding before opening WBSK Studio.

- [ ] Album cover 3:7, bride photo 4:5, groom photo 4:5, card photo 4:5, desktop cover 21:9 and mobile cover 3:4 are all exported (all six are required)
- [ ] The album cover is a tall photo with the couple large in the frame, and no text on it
- [ ] The bride and groom photos look like a pair, and face the middle of the album
- [ ] No faces in the lower-left corner of either cover
- [ ] 50–60 gallery photos, numbered in the order they should appear
- [ ] A 16:9 poster for the teaser and for the highlight film, if those links will be added
- [ ] Every file is sRGB JPEG, with no location data and no watermark
- [ ] File names follow couple-slot-number
- [ ] Short description (about 120 characters) and "Their story" (60–120 words) are written
- [ ] In the Studio, set a focal point on each image and add a description for every photo; publishing waits until all are done

RAW files and full delivery sets never go into the Studio; only these web-ready exports. Hero video export settings are covered in a separate guide.
