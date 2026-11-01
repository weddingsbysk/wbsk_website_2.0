# Cover Video Export Guide

Nov 1, 2026 · @Siddhant

For the homepage hero and the Pre-wedding cover: each needs a desktop video, a phone video and two posters.

## Settings at a glance

Export each cover twice — once for computers, once for phones — with these values.

|  | Desktop video | Phone video |
| --- | --- | --- |
| Frame size | 1920 × 1080 (landscape) | 1080 × 1920 (portrait, framed for phones — not a crop of the desktop video) |
| Length | 1:30, looping | 1:30, looping |
| Format | MP4, H.264 | MP4, H.264 |
| Bitrate | VBR, 2 pass, target 2.5 Mbps | VBR, 2 pass, target 2.5 Mbps |
| Sound | None | None |
| File size | About 28 MB (must be under 30 MB) | About 28 MB (must be under 30 MB) |
| Poster | 16:9, from the first frame | 9:16, from the first frame |

Why 28 MB: 2.5 Mbps × 90 seconds ≈ 28 MB. The Studio refuses anything over 30 MB. Don't export in 4K — it adds size with no visible gain on the website.

## Making a seamless loop

The video plays over and over, so the end must flow back into the start.

- End on a shot that matches the opening shot's light and movement, or fade the last second into the first frame.
- Use slow, calm shots. Avoid quick cuts.
- **Nothing may flash** more than three times a second (a website safety rule).
- No text or titles burned into the video; the website adds its own.
- Keep faces away from the very edges: different screens crop slightly differently.

## Export in Premiere Pro

Do this once for the desktop sequence and once for the phone sequence. Menu names are from recent Premiere Pro versions and may differ slightly in yours.

1. **Two sequences:** one at 1920 × 1080 and one at 1080 × 1920 (Sequence → Sequence Settings → Frame Size). Keep your usual frame rate.
2. **Mark exactly 1:30:** press **I** at the start and **O** at the end.
3. Open the **Export** tab at the top (or press Ctrl/Cmd + M).
4. **Format:** H.264. **Range:** Source In/Out.
5. **Video:**
   - Frame size: match the sequence.
   - Profile: High.
   - Bitrate Encoding: **VBR, 2 pass**.
   - Target Bitrate: **2.5 Mbps**. Maximum Bitrate: **4 Mbps**.
6. **Audio:** switch the Audio section **off** (the website plays covers silently).
7. **Check the estimated file size** at the bottom: it must be under 30 MB. If it is over, lower the target to 2.3 Mbps.
8. **Name the files** clearly, e.g. `hero-desktop.mp4`, `hero-phone.mp4`, `prewedding-desktop.mp4`, `prewedding-phone.mp4`.
9. Press **Export**.

## Posters

The poster shows while the video starts, and instead of it on slow connections, data-saver or reduced motion. It must match the first frame so the change is seamless.

1. In each sequence, put the playhead on the **very first frame**.
2. Press the camera icon (**Export Frame**) under the Program monitor. Choose **TIFF** or **PNG**, full size.
3. Open the frame in Lightroom and export it with the **hero poster** settings in the Photo Export Guide:
   - Desktop: 16:9, at least 1920 × 1080 (recommended 2560 × 1440).
   - Phone: 9:16, at least 1080 × 1920 (recommended 1350 × 2400).
4. Don't re-grade it: it must look exactly like the video.

## Before you upload

- [ ] Desktop video is 1920 × 1080; phone video is 1080 × 1920
- [ ] Both are 1:30 and loop smoothly
- [ ] Both are silent MP4 (H.264)
- [ ] Both are under 30 MB
- [ ] Two posters, each matching its video's first frame
- [ ] Nothing flashes; no quick cuts

## After you upload

1. In WBSK Studio, open **Homepage → Hero video** or **Pre-wedding → Cover video** and replace all four files together.
2. For the Pre-wedding cover, update the **credit line** (e.g. "Meera & Arjun · Udaipur").
3. Check the phone preview, then **Open full size ↗** for desktop.
4. Publish, and look at the live page on your phone once it says **Live on the website ✓**.
