/* The film's sets: every screen of the Studio redrawn as artwork, on a 1920 x 1080 stage. Nothing here moves;
   film.js does all the moving. All the names and figures are samples. */

const LOGO = "/apps/web/public/wbsk-logo.svg";
const icon = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const I = {
  home: icon('<path d="M4 11.2 12 4.5l8 6.7V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>'),
  content: icon('<rect x="4" y="4.5" width="16" height="15" rx="2.5"/><path d="M9.5 4.5v15M13 9h4M13 12.5h4"/>'),
  photos: icon('<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17 5-4.2 3.4 2.8 3-2.4L20 16.6"/>'),
  guide: icon('<path d="M5 5.2c2.6-1 5-.8 7 .8 2-1.6 4.4-1.8 7-.8v13.6c-2.6-1-5-.8-7 .8-2-1.6-4.4-1.8-7-.8z"/><path d="M12 6v13.6"/>'),
  play: icon('<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="m10 9 5 3-5 3z"/>'),
  rupee: icon('<path d="M7 5h10M7 9.5h10M7 5h3.5a4.5 4.5 0 0 1 0 9H7l7.5 6"/>'),
  search: icon('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>'),
  out: icon('<path d="M9 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3M14 5h5v5M19 5l-8 8"/>'),
  rings: icon('<circle cx="9" cy="14" r="5.2"/><circle cx="15" cy="14" r="5.2"/><path d="m7.5 4.5 1.5 2 1.5-2"/>'),
  film: icon('<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M7.5 5v14M16.5 5v14M3.5 9.5h4M3.5 14.5h4M16.5 9.5h4M16.5 14.5h4"/>'),
  quote: icon('<path d="M5 18c2.8-1 4.4-3.2 4.4-6V7H5v5h2.2M14 18c2.8-1 4.4-3.2 4.4-6V7H14v5h2.2"/>'),
  map: icon('<path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 0 0-13 0c0 5.4 6.5 11 6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'),
  role: icon('<rect x="4" y="8" width="16" height="11" rx="2.5"/><path d="M9 8V6.2A1.7 1.7 0 0 1 10.7 4.5h2.6A1.7 1.7 0 0 1 15 6.2V8M4 12.8h16"/>'),
  team: icon('<circle cx="9" cy="9" r="3.2"/><path d="M3.5 19c.4-3.2 2.6-5 5.5-5s5.1 1.8 5.5 5M15.5 6.2a3 3 0 0 1 0 5.6M17 14.3c2 .5 3.2 2.2 3.5 4.7"/>'),
  record: icon('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.4"/><path d="M12 6a6 6 0 0 1 6 6"/>'),
  star: icon('<path d="m12 4.5 2.3 4.8 5.2.7-3.8 3.6.9 5.2-4.6-2.5-4.6 2.5.9-5.2L4.5 10l5.2-.7z"/>'),
  form: icon('<rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M9 8.5h6M9 12h6M9 15.5h3.5"/>'),
  box: icon('<path d="m4 8 8-4 8 4v8l-8 4-8-4z"/><path d="m4 8 8 4 8-4M12 12v8"/>'),
  gear: icon('<circle cx="12" cy="12" r="2.8"/><path d="M12 3.8v2.4M12 17.8v2.4M3.8 12h2.4M17.8 12h2.4M6.2 6.2l1.7 1.7M16.1 16.1l1.7 1.7M6.2 17.8l1.7-1.7M16.1 7.9l1.7-1.7"/>'),
  pen: icon('<path d="m5 19 1-4L16 5l3 3L9 18zM14 7l3 3"/>'),
  help: icon('<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2 1-1.2 1.8"/><path d="M12 16.6v.1"/>'),
  lock: icon('<rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5"/>'),
  eyeoff: icon('<path d="M4 12s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"/><circle cx="12" cy="12" r="2.4"/><path d="m5 19 14-14"/>'),
  door: icon('<path d="M13 4H7a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h6"/><path d="M11 12h9M17 9l3 3-3 3"/>'),
  whatsapp: icon('<path d="M4.5 20 6 15.8A7.8 7.8 0 1 1 9 18.7z"/><path d="M9.5 9.2c0 3 2.3 5.3 5.3 5.3l1-1.6-1.9-1-.9.8c-1-.4-1.7-1.1-2.1-2.1l.8-.9-1-1.9z"/>'),
  mail: icon('<rect x="3.5" y="6" width="17" height="12.5" rx="2.5"/><path d="m4 7.5 8 6 8-6"/>'),
  copy: icon('<rect x="8.5" y="8.5" width="11" height="11" rx="2.2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>'),
  back: icon('<path d="M15 5l-7 7 7 7"/>'),
  next: icon('<path d="M9 5l7 7-7 7"/>'),
};

const TONES = [["#b08e6c", "#4a3627"], ["#94765c", "#3c2d21"], ["#c8a581", "#64493a"], ["#a68668", "#46352a"], ["#d3b28e", "#745845"], ["#8a6f5a", "#35281f"]];
const tone = (i, text = "Sample", cls = "", attrs = "") => `<div class="tone ${cls}" ${attrs} style="--a:${TONES[i % 6][0]};--b:${TONES[i % 6][1]}"><span>${text}</span></div>`;

let labelCount = 0;
const record = (id, cls = "") => {
  labelCount += 1;
  return `<div class="record ${cls}"${id ? ` id="${id}"` : ""}><i class="record__sheen"></i><div class="record__label"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#DDAF3A"/><circle cx="50" cy="50" r="46" fill="none" stroke="#1F1914" stroke-opacity=".35" stroke-width=".6"/><defs><path id="arc-${labelCount}" d="M50 50m-34 0a34 34 0 1 1 68 0a34 34 0 1 1-68 0"/></defs><text fill="#1F1914" font-family="Outfit" font-size="7.4" letter-spacing="2.5"><textPath href="#arc-${labelCount}">WEDDINGS BY SIDDHANT KAPOOR · STUDIO ·</textPath></text><circle cx="50" cy="50" r="5" fill="#15100C"/></svg></div></div>`;
};
const labelled = (name, number) => {
  labelCount += 1;
  return `<div class="record record--mini"><i class="record__sheen"></i><div class="record__label"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#DDAF3A"/><defs><path id="arc-${labelCount}" d="M50 50m-36 0a36 36 0 1 1 72 0a36 36 0 1 1-72 0"/></defs><text fill="#1F1914" font-family="Outfit" font-size="9" letter-spacing="1.2"><textPath href="#arc-${labelCount}">${name} · ${number} ·</textPath></text><circle cx="50" cy="50" r="5" fill="#15100C"/></svg></div></div>`;
};

/* Words split for kinetic type: each word keeps together, each letter rises on its own. */
const kinetic = (text, em = []) =>
  text
    .split(" ")
    .map((word) => `<span class="wd${em.includes(word) ? " wd--em" : ""}">${[...word].map((c) => `<span class="ch">${c === "&" ? "&amp;" : c}</span>`).join("")}</span>`)
    .join(" ");

const TOOLS = [["home", "Home", I.home], ["content", "Content", I.content], ["quotes", "Quotes", I.rupee], ["photos", "Photos", I.photos], ["guide", "Guide", I.guide], ["tutorials", "Tutorials", I.play]];
const nav = (prefix) => `
  <div class="nav sheet" id="${prefix}-nav">
    <div class="brand"><img src="${LOGO}" alt=""><span>STUDIO</span></div>
    <div class="tools"><span class="toolpill" id="${prefix}-pill"></span>${TOOLS.map(([key, name, ic]) => `<div class="tool" id="${prefix}-t-${key}">${ic}${name}</div>`).join("")}</div>
    <div class="navright">
      <div class="navsearch" id="${prefix}-search">${I.search}<kbd>⌘K</kbd></div>
      <div class="status"><i class="dot" id="${prefix}-dot"></i><span id="${prefix}-status">Website live · updated 8 min ago</span></div>
      <div class="navview">View website ${I.out}</div>
      <div class="avatar">S</div>
    </div>
  </div>`;

const switcher = (id) => `<div class="switch" id="${id}"><i class="switch__on"></i><i class="switch__knob"></i></div>`;
const field = (label, id, extra = "", note = "") => `<div class="field"><label>${label}</label>${note ? `<p>${note}</p>` : ""}<div class="input" id="${id}"${extra}><span id="${id}-t"></span><i class="caret"></i></div></div>`;

const STEPS = ["Couple", "Photos", "Story", "Films &amp; reels", "Homepage"];
const QUICK = [["Add a wedding", "Names, six photos, gallery, films. Step by step.", I.rings], ["Add a film", "YouTube link and poster.", I.film], ["Add a review", "Paste a couple’s words, add stars, approve.", I.quote], ["Add a pre-wedding shoot", "Pick its destination; its page fills itself.", I.map], ["Change a cover video", "Desktop, phone and two posters.", I.play], ["Update open roles", "Shown on Careers and in its form.", I.role]];
const row = (ic, title, note, go = "→") => `<div class="row"><div class="mark">${ic}</div><span class="row__t">${title}${note ? `<small>${note}</small>` : ""}</span><span class="go">${go}</span></div>`;

/* ---------- The opening ---------- */
const RINGS = Array.from({ length: 16 }, (_, i) => 118 + i * 21.5);
const openingHTML = `
<div class="scene" id="s-open">
  <div id="op-table"></div>
  <div id="op-disc">
    ${record("op-rec", "record--big")}
    <svg id="op-rings" viewBox="-440 -440 880 880">${RINGS.map((r) => `<circle class="op-ring" r="${r}" pathLength="1"/>`).join("")}</svg>
    <div id="op-spark"></div>
  </div>
  <svg id="op-arm" viewBox="0 0 400 720"><defs><linearGradient id="arm-tube" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a7a58"/><stop offset=".45" stop-color="#f3e6c4"/><stop offset="1" stop-color="#a08a60"/></linearGradient></defs>
    <circle cx="330" cy="70" r="52" fill="#241b14" stroke="#ddaf3a" stroke-opacity=".5" stroke-width="1.5"/><circle cx="330" cy="70" r="36" fill="#31261c"/>
    <rect x="316" y="-34" width="28" height="62" rx="8" fill="#6d5c42"/>
    <path d="M330 70 L330 360 Q330 470 268 572" fill="none" stroke="url(#arm-tube)" stroke-width="11" stroke-linecap="round"/>
    <circle cx="330" cy="70" r="13" fill="#ddaf3a"/>
    <path d="M252 556 l34 22 l-22 66 l-44 -28 z" fill="#ddaf3a"/><path d="M226 618 l14 8 l-8 16 z" fill="#f3e6c4"/></svg>
</div>`;

/* ---------- Home ---------- */
const homeHTML = `
<div class="scene" id="s-home">
  <div class="sheet winbg" id="h-bg"></div>
  ${nav("h")}
  <div class="sheet" id="h-hero">
    <i class="hero__glow"></i>
    <h1>Good morning, Siddhant</h1><p>What would you like to do today?</p>
    <div class="spotbtn" id="h-spotbtn">${I.search}<span>Add a wedding, a couple’s name, a page…</span><kbd>⌘K</kbd></div>
    <div class="hero__film">New here? Watch the short film →</div>
    ${record("h-rec")}
  </div>
  <div id="h-actions">${QUICK.map(([t, s, ic], i) => `<div class="sheet action" id="h-a${i}"><div class="ico">${ic}</div><span><b>${t}</b><span>${s}</span></span></div>`).join("")}</div>
  <div class="sheet panel" id="h-wait"><h2>Waiting for you</h2>
    ${row(I.pen, "Sample Nina &amp; Sample Vir", "Draft · open it to see what’s left")}
    ${row(I.quote, "Review from Sample Zoya", "Needs approval")}
    ${row(I.record, "Sample Udaipur", "Shows on the records once it has a shoot")}
  </div>
  <div class="sheet panel" id="h-worth"><h2>Worth a look</h2>
    ${row(I.star, "Google rating not updated for 60+ days", "", "Fix →")}
    ${row(I.gear, "Backup email is empty", "", "Fix →")}
    ${row(I.record, "Samples still showing: 12", "", "")}
  </div>
  <div class="sheet panel" id="h-last"><h2>Last published</h2>
    <div class="lastrow">${tone(0, "Sample", "lastthumb")}<div><b>Sample Asha &amp; Sample Kabir</b><small>2 hr ago · Live on the website ✓</small><small class="goldlink">Open page ↗</small></div></div>
  </div>

  <div class="sheet" id="spot-veil"></div>
  <div class="sheet" id="spot">
    <div class="spotfield">${I.search}<span class="ph" id="spot-ph">Add a wedding, a couple’s name, a page…</span><span id="spot-t"></span><i class="caret" id="spot-caret"></i></div>
    <div class="spotlist">
      <div class="spotset" id="set-0"><div class="spothead">Do something</div>
        <div class="spotitem on"><div class="mark">${I.rings}</div>Add a wedding</div><div class="spotitem"><div class="mark">${I.film}</div>Add a film</div><div class="spotitem"><div class="mark">${I.quote}</div>Add a review</div><div class="spotitem"><div class="mark">${I.map}</div>Add a pre-wedding shoot</div></div>
      <div class="spotset hide" id="set-1"><div class="spothead">Found</div>
        <div class="spotitem on">${tone(0, "", "spotthumb")}<span>Sample Asha &amp; Sample Kabir<small>Wedding · Goa</small></span></div><div class="spotitem">${tone(1, "", "spotthumb")}<span>Sample Asha &amp; Sample Kabir<small>Film · Highlight</small></span></div><div class="spotitem"><div class="mark">${I.quote}</div><span>Sample Asha &amp; Sample Kabir<small>Review</small></span></div></div>
      <div class="spotset hide" id="set-2"><div class="spothead">Do something</div>
        <div class="spotitem on" id="spot-add"><div class="mark">${I.rings}</div>Add a wedding</div><div class="spothead">Go to</div><div class="spotitem"><div class="mark">${I.rings}</div>Weddings</div></div>
    </div>
  </div>
</div>`;

/* ---------- The wedding form ---------- */
const miniAlbum = (i, a, b) => `<div class="malbum" id="ma-${i}">
  <div class="album__paper"><small>Sample<br>wedding</small><div class="album__names"><span>${a}</span><span>${b}</span></div><small class="album__when">Sample city<br>2026</small><div class="album__mark">W<b>B</b>SK</div></div>
  <div class="album__photo">${tone(i, "Sample")}</div></div>`;
const sideItem = (ic, name, on) => `<div class="sideitem${on ? " on" : ""}">${ic}${name}</div>`;
const editHTML = `
<div class="scene" id="s-edit">
  <div class="sheet winbg" id="e-bg"></div>
  ${nav("e")}
  <div class="sheet" id="side">
    <div class="sidehead">Website pages</div>
    ${sideItem(I.home, "Homepage")}${sideItem(I.rings, "Weddings", true)}${sideItem(I.film, "Films")}${sideItem(I.record, "Pre-wedding")}${sideItem(I.team, "Our team")}${sideItem(I.role, "Careers")}
    <div class="sidehead">Couples’ words</div>
    ${sideItem(I.quote, "Reviews")}${sideItem(I.star, "Featured on")}
    <div class="sidehead">Forms</div>
    ${sideItem(I.form, "Enquiry forms")}${sideItem(I.box, "Packages")}
    <div class="sidehead">Settings</div>
    ${sideItem(I.gear, "Site settings")}
  </div>
  <div class="sheet" id="form">
    <div id="kicker">Wedding</div><h1 id="ed-title">New wedding</h1>
    <div id="help-btn">${I.help}<span>How this works</span></div>
    <div id="tabs"><span id="tabpill"></span>
      ${STEPS.map((name, i) => `<div class="tab" id="tab-${i}">${i + 1}&nbsp; ${name}<svg class="tick" id="tick-${i}" viewBox="0 0 24 24"><path d="m5 12.6 4.6 4.6L19 7.5"/></svg></div>`).join("")}
    </div>

    <div class="body" id="b-couple">
      <div class="two">${field("First name", "f-first")}${field("Second name", "f-second")}</div>
      <div class="two">
        <div class="field"><label>Place label</label><div class="radios"><span class="radio"><i class="sel"></i>Destination</span><span class="radio"><i></i>Local</span></div></div>
        <div class="field hide" id="addr-field"><label>Page address</label><div class="address">/client/meera-arjun/</div></div>
      </div>
      <div class="two">${field("City", "f-city")}${field("Venue", "f-venue")}</div>
      <div class="two hide" id="date-row">${field("Wedding date", "f-date")}</div>
    </div>

    <div class="body hide" id="b-photos">
      <div class="thumbs" id="thumbs">${[["Album", 0, 56], ["Bride", 1, 96], ["Groom", 2, 96], ["Card", 3, 96], ["Desktop", 4, 234], ["Phone", 5, 90]].map(([name, i, w]) => `<div class="thumb" style="width:${w}px">${tone(i, "")}<small>${name}</small></div>`).join("")}</div>
      <div id="gal-label">Gallery · <b id="gal-count">0</b> photos</div>
      <div id="gallery">${Array.from({ length: 48 }, (_, i) => `<div class="tile" style="--a:${TONES[i % 6][0]};--b:${TONES[(i + 3) % 6][1]}">${i === 18 ? '<span id="gal-small">Small</span>' : ""}</div>`).join("")}</div>
      <div id="desc-box" class="hide">${tone(2, "Sample", "desc-photo")}<div class="field"><label>Description</label><div class="input on" id="f-desc"><span id="f-desc-t"></span><i class="caret"></i></div><p id="desc-note">Publishing waits until every photo has one.</p></div></div>
    </div>

    <div class="body hide" id="b-story">
      ${field("Short description", "f-short", "", "About 120 characters. Shown under the card.")}
      ${field("Their story", "f-story", ' style="align-items:flex-start;min-height:150px"', "60 to 120 words.")}
    </div>

    <div class="body hide" id="b-films">
      <div class="filmrow">${tone(1, "Poster 16:9", "poster", 'id="poster-a"')}<div class="field">${`<label>Highlight film</label><div class="input" id="f-film"><span id="f-film-t"></span><i class="caret"></i></div>`}<p>A YouTube link, with its poster.</p></div></div>
      <div class="filmrow">${tone(3, "Poster 16:9", "poster", 'id="poster-b"')}<div class="field"><label>Teaser film</label><div class="input" id="f-teaser"><span id="f-teaser-t"></span><i class="caret"></i></div></div></div>
      <div class="field"><label>Instagram reel</label><div class="input" id="f-reel"><span id="f-reel-t"></span><i class="caret"></i><span class="chip" id="reel-chip">Sangeet</span></div></div>
    </div>

    <div class="body hide" id="b-home">
      <div class="featrow" id="featrow">${switcher("sw-feat")}<span><b>Featured on the homepage</b><small>Shows this wedding’s album in the row on the homepage.</small></span></div>
      <div id="hometray"><small>On the homepage</small>
        <div class="trayitem">${miniAlbum(0, "Nina", "Vir")}</div><div class="trayitem">${miniAlbum(2, "Asha", "Kabir")}</div><div class="trayitem" id="tray-ours">${miniAlbum(1, "Meera", "Arjun")}</div><div class="trayitem trayitem--r">${miniAlbum(3, "Zoya", "Dev")}</div><div class="trayitem trayitem--r">${miniAlbum(4, "Tara", "Rohan")}</div>
      </div>
    </div>

    <div id="stepbar">
      <div class="stepbtn" id="step-back">${I.back}Back</div>
      <div id="step-mid"><div id="step-words">Step <b id="step-n">1</b> of 5<span id="step-name">Couple</span></div><div id="step-line"><i id="step-fill"></i></div></div>
      <div class="stepbtn stepbtn--go" id="step-next">Next${I.next}</div>
    </div>

    <div id="bar">
      <svg id="ring" viewBox="0 0 58 58"><circle id="ring-track" cx="29" cy="29" r="24"/><circle id="ring-fill" cx="29" cy="29" r="24" stroke-dasharray="150.8" stroke-dashoffset="150.8"/><path id="ring-tick" class="hide" d="m19 30 7 7 13-15"/></svg>
      <div id="bar-words"><strong id="bar-state">New</strong>
        <div class="barset">
          <span id="b-new">Fill in each step. This bar lists what’s left before you can publish.</span>
          <div class="chips hide" id="b-chips"><span id="b-left">Before publishing:</span><span class="chip" id="chip-a">wedding date</span><span class="chip" id="chip-b">3 photo descriptions</span><span class="chip" id="chip-c">bride page</span></div>
          <span id="b-ready" class="hide">Nothing left. Ready to publish.</span>
          <span id="b-pub" class="hide">Publishing… the website updates in about 10 minutes. You can keep working.</span>
        </div></div>
    </div>
    <div id="foot">
      <div id="saved" class="hide"><i id="saved-dot"></i><span id="saved-t">Saved just now</span></div>
      <div id="pub"><div id="pub-lit" class="hide"></div><div id="pub-sheen"></div><b>Publish</b></div>
    </div>
  </div>

  <div class="sheet" id="pv">
    <div id="pv-head"><span>PREVIEW · DRAFT</span><div class="seg"><span>Desktop</span><span class="on">Phone</span></div></div>
  </div>
  <div class="sheet" id="phone">
    <div class="pv-nav"><img src="${LOGO}" alt=""></div>
    <div id="pv-empty"></div>
    <div id="pv-cover" class="hide">${tone(5, "Sample: phone cover")}</div>
    <div id="pv-card"><small>DESTINATION · <span id="pv-city">PLACE</span></small><span id="pv-names">First name &amp;<br>Second name</span></div>
    <div id="pv-story">Their story appears here as you type.</div>
  </div>

  <div class="sheet drawer" id="drawer-c"><small>How this works</small><h3>Adding a review</h3></div>
  <div class="sheet drawer" id="drawer-b"><small>How this works</small><h3>Adding a film</h3></div>
  <div class="sheet drawer" id="drawer">
    <div class="drawer__x">×</div>
    <small>How this works</small><h3>Adding a wedding</h3>
    ${[["Fill in each step.", "Any order. It saves itself as you go."], ["Add the six photos.", "The form tells you each size."], ["Describe every photo.", "A short sentence each. Allow 10 to 15 minutes."], ["Check the preview.", "Only you can see drafts."], ["Press Publish.", "On the website in about 10 minutes."]].map(([a, b], i) => `<div class="hstep" id="hstep-${i}"><i>${i + 1}</i><span><b>${a}</b>${b}</span></div>`).join("")}
  </div>
</div>`;

/* ---------- The six photographs ---------- */
const SLOTS = [
  { id: "cover", name: "Album cover", ratio: "3:7", min: "at least 900 × 2100", w: 240, h: 560, x: 200 },
  { id: "bride", name: "Bride page", ratio: "4:5", min: "at least 1600 × 2000", w: 352, h: 440, x: 500 },
  { id: "groom", name: "Groom page", ratio: "4:5", min: "at least 1600 × 2000", w: 352, h: 440, x: 892 },
  { id: "card", name: "Card", ratio: "4:5", min: "at least 1600 × 2000", w: 352, h: 440, x: 1390 },
  { id: "desk", name: "Desktop cover", ratio: "21:9", min: "at least 2560 px wide", w: 840, h: 360, x: 1892 },
  { id: "mob", name: "Phone cover", ratio: "3:4", min: "at least 1500 × 2000", w: 330, h: 440, x: 2782 },
];
const sixHTML = `
<div class="scene" id="s-six">
  <div id="six-wall"></div>
  <div class="bracket" id="br-a" style="left:200px;width:1044px;top:-30px"><span>The homepage album</span></div>
  <div class="bracket" id="br-b" style="left:1390px;width:352px;top:92px"><span>Weddings page</span></div>
  <div class="bracket" id="br-c" style="left:1892px;width:1220px;top:92px"><span>Top of the couple’s page</span></div>
  ${SLOTS.map((s, i) => `<div class="slot" id="sl-${s.id}" style="left:${s.x}px;top:${620 - s.h}px;width:${s.w}px;height:${s.h}px">
      <div class="slot__head"><b>${s.name}</b><svg class="slot__tick" viewBox="0 0 24 24"><path d="m5 12.6 4.6 4.6L19 7.5"/></svg></div>
      <div class="slot__well"><span>+</span></div>
      <div class="slot__photo">${tone(i + 1, `Sample: ${s.name.toLowerCase()}`)}</div>
      <div class="slot__foot"><b>${s.ratio}</b>${s.min}</div>
    </div>`).join("")}
  <div id="tiny">${tone(1, "1920 × 823")}</div>
  <div id="nope"><b>This photo is too small for the desktop cover.</b> Please upload one at least 2560 px wide. Yours was 1920 × 823.</div>
  <div id="focus"></div><div id="band">Name label sits here</div>
</div>`;

/* ---------- The homepage album ---------- */
const albumHTML = `
<div class="scene" id="s-album">
  <div id="al-table"></div>
  <div id="al-row">
    ${miniAlbum(0, "Nina", "Vir")}${miniAlbum(2, "Asha", "Kabir")}
    <div id="album-slot"></div>
    ${miniAlbum(3, "Zoya", "Dev")}${miniAlbum(4, "Tara", "Rohan")}
  </div>
  <div id="album">
    <i id="album-shadow"></i>
    <i class="album__board"></i>
    <i class="album__edge album__edge--r"></i><i class="album__edge album__edge--b"></i>
    <div class="album__page album__page--r" id="page-r">
      ${tone(4, "Sample: groom page", "album__print")}
      <div class="album__who"><span>Sample Arjun</span><b>Groom</b></div>
      <i class="album__gutter album__gutter--r"></i>
    </div>
    <div id="album-cover">
      <div class="album__front">
        <div class="album__paper"><small>Sample<br>wedding</small><div class="album__names"><span>Meera</span><span>Arjun</span></div><small class="album__when">Goa<br>November 2026</small><div class="album__mark">W<b>B</b>SK</div></div>
        <div class="album__photo">${tone(1, "Sample: album cover")}</div>
        <i class="album__glare" id="album-glare"></i>
      </div>
      <div class="album__page album__page--l" id="page-l">
        ${tone(2, "Sample: bride page", "album__print")}
        <div class="album__who"><span>Sample Meera</span><b>Bride</b></div>
        <i class="album__gutter album__gutter--l"></i>
      </div>
    </div>
  </div>
</div>`;

/* ---------- Everything else, on a turning carousel ---------- */
const miniPage = (id, title, slots) => `<div class="minipage" id="${id}"><small>${title}</small><div class="minipage__grid">${Array.from({ length: slots }, (_, i) => `<i class="${i === 0 ? "lit" : ""}"></i>`).join("")}</div></div>`;
const destinationNames = [["Sample Goa", "WBSK 001"], ["Sample Udaipur", "WBSK 002"], ["Sample Jaipur", "WBSK 003"], ["Sample Kochi", "WBSK 004"], ["Sample Shimla", "WBSK 005"]];
const spinHTML = `
<div class="scene" id="s-spin">
  <div id="ring-3d">
    <div class="card3d" id="c-films"><div class="c__head"><small>Content › Films</small><h3>Films</h3></div>
      <div class="c__films">
        <div class="filmcard">${tone(1, "Sample poster 16:9", "filmcard__poster")}<i class="playmark"></i><b>Sample Meera &amp; Sample Arjun</b><small>Highlight · YouTube link</small></div>
        <div class="c__switches">
          <div class="swrow">${switcher("sw-f1")}<span><b>Featured</b><small>Shows on the homepage</small></span></div>
          <div class="swrow">${switcher("sw-f2")}<span><b>Show on Films page</b><small>Shows on the Films page</small></span></div>
        </div>
        <div class="c__dest">${miniPage("mp-home", "Homepage", 3)}${miniPage("mp-films", "Films page", 6)}</div>
      </div>
    </div>
    <div class="card3d" id="c-pre"><div class="c__head"><small>Content › Pre-wedding</small><h3>Pre-wedding</h3></div>
      <div class="pre__flow">
        <div class="pre__step" id="pre-a"><i>1</i><b>Destination</b><small>B&amp;W PNG and two covers</small></div>
        <div class="pre__step" id="pre-b"><i>2</i><b>Shoot</b><small>Full-length or Concept</small></div>
        <div class="pre__step" id="pre-c"><i>3</i><b>Record</b><small>Appears by itself</small></div>
      </div>
      <div id="arc">${destinationNames.map(([n, c], i) => `<div class="arcrec" id="arc-${i}">${labelled(n, c)}<b>${n}</b></div>`).join("")}</div>
    </div>
    <div class="card3d" id="c-rev"><div class="c__head"><small>Couples’ words › Reviews</small><h3>Reviews</h3></div>
      <div class="rev">
        <blockquote>“Sample words from a sample couple, in their own voice, exactly as they wrote them.”</blockquote>
        <div class="rev__by">Sample Tara &amp; Sample Rohan <span class="stars">${Array.from({ length: 5 }, (_, i) => `<i class="star" id="st-${i}">${I.star}</i>`).join("")}</span></div>
        <div class="swrow">${switcher("sw-rev")}<span><b>Approved</b><small>Without this it stays off the website.</small></span></div>
      </div>
      <p class="c__note">Always ask the couple’s permission first.</p>
    </div>
    <div class="card3d" id="c-team"><div class="c__head"><small>Website pages › Our team</small><h3>Our team</h3></div>
      <div class="team">${[["Sample Member", "Lead photographer"], ["Sample Member", "Film editor"], ["Sample Member", "Second shooter"], ["Sample Member", "Studio manager"]].map(([n, r], i) => `<div class="teamcard" id="tm-${i}">${tone(i + 1, "Sample", "bw")}<b>${n}</b><small>${r}</small></div>`).join("")}</div>
      <p class="c__note">A black and white 4:5 portrait, a name and a role.</p>
    </div>
    <div class="card3d" id="c-roles"><div class="c__head"><small>Website pages › Careers</small><h3>Open roles</h3></div>
      <div class="roles">${[["Sample photographer role", "Shown"], ["Sample film editor role", "Shown"], ["Sample assistant role", "Hidden"]].map(([n, s], i) => `<div class="rolerow" id="rl-${i}">${I.role}<b>${n}</b><span class="rolestate${s === "Hidden" ? " off" : ""}">${s}</span></div>`).join("")}</div>
      <p class="c__note">Each open role shows on the Careers page and in its form.</p>
    </div>
    <div class="card3d" id="c-feat"><div class="c__head"><small>Couples’ words › Featured on</small><h3>Featured on</h3></div>
      <div class="feats">${["Sample Magazine", "Sample Journal", "The Sample Post", "Sample Weddings", "Sample Review", "Sample Times"].map((n, i) => `<div class="feat" id="fe-${i}">${n}</div>`).join("")}</div>
      <p class="c__note">The names that have written about you, in a quiet row on the website.</p>
    </div>
  </div>
</div>`;

/* ---------- The chat ---------- */
const bubble = (id, who, text) => `<div class="turn turn--${who} hide" id="${id}">${who === "them" ? '<i class="seal">W</i>' : ""}<div class="bub" id="${id}-b">${text}</div></div>`;
const chatHTML = `
<div class="scene" id="s-chat">
  <div class="sheet" id="chat">
    <div id="chat-site">On the website</div>
    <div id="chat-head"><i class="seal seal--big">W</i><div><b>Tell us about your wedding</b><small>One question at a time</small></div><i id="chat-progress"><i id="chat-fill"></i></i></div>
    <div id="chat-log">
      ${bubble("m-1", "them", "Please tell me your name.")}
      ${bubble("m-2", "me", "Sample Meera")}
      ${bubble("m-3", "them", "Lovely to meet you, Meera.")}
      ${bubble("m-4", "them", "Where is your wedding destination?")}
      ${bubble("m-5", "me", "Goa")}
      ${bubble("m-6", "them", "Goa, beautiful.")}
      <div class="turn turn--them hide" id="m-7"><i class="seal">W</i><div class="bub">How many cameramen do you need?</div></div>
      <div class="pickrow hide" id="m-8">${["1", "2", "3", "4 or more", "Not sure"].map((c, i) => `<span class="pick" id="pick-${i}">${c}</span>`).join("")}</div>
    </div>
    <div id="chat-typing"><i></i><i></i><i></i></div>
  </div>
  <div class="sheet" id="qform">
    <div id="q-studio">In the Studio</div><small>Forms › Wedding form</small><h3>The questions</h3>
    <div class="qrow qrow--open" id="q-open">
      <div class="qrow__top"><b>Where is your wedding destination?</b><span>Shown</span></div>
      <div class="qfield"><label>How the chat asks it</label><div class="input" id="f-ask"><span id="f-ask-t"></span><i class="caret"></i></div></div>
      <div class="qfield"><label>What the chat says back</label><div class="input" id="f-reply"><span id="f-reply-t"></span><i class="caret"></i></div><p>[answer] is what they said. [first] is their first name.</p></div>
    </div>
    <div class="qrow" id="q-guests"><b>Roughly how many guests?</b>${switcher("sw-guests")}<span class="qstate" id="q-guests-s">Shown</span></div>
    <div class="qrow"><b>When is the wedding?</b>${switcher("sw-q2")}<span class="qstate">Shown</span></div>
  </div>
</div>`;

/* ---------- Quotes ---------- */
const qchips = (id, options, on) => `<div class="qchips" id="${id}">${options.map((o, i) => `<span class="qchip${i === on ? " on" : ""}" id="${id}-${i}">${o}</span>`).join("")}</div>`;
const LINES = [["Base fee", "₹10,000"], ["2 × 2 days of cameramen", "₹40,000"], ["Travel and stay", "₹6,000"], ["Larger wedding (100–250)", "₹5,600"], ["Tax", "₹6,160"]];
const quotesHTML = `
<div class="scene" id="s-quotes">
  <div class="sheet winbg" id="q-bg"></div>
  ${nav("q")}
  <div class="sheet" id="q-head"><h1>Quotes</h1><p>Fill in what the couple told the chat, and send them a rough estimate. Nothing about a couple is saved here.</p></div>
  <div class="sheet qpanel" id="q-enq"><h2>The enquiry</h2>
    <div class="qgrid">${field("Name", "q-name")}${field("Destination", "q-place")}${field("Wedding date", "q-date")}</div>
    <div class="qline"><label>What they’d like</label>${qchips("qc-what", ["Photographs and film", "Photographs only", "Film only"], -1)}</div>
    <div class="qline"><label>Cameramen</label>${qchips("qc-cam", ["1", "2", "3", "4", "5", "6", "Not sure"], -1)}</div>
    <div class="qgrid2"><div class="qline"><label>Days</label><div class="input input--small" id="q-days"><span id="q-days-t"></span></div></div><div class="qline"><label>Where</label>${qchips("qc-where", ["In their city", "Destination"], -1)}</div></div>
    <div class="qline"><label>Guests</label>${qchips("qc-guests", ["Under 100", "100–250", "250–500", "500+"], -1)}</div>
  </div>
  <div class="sheet qpanel" id="q-est"><h2>Rough estimate <em id="q-made">Made-up figures</em></h2>
    <div id="q-range"><span id="q-low">₹0</span> <small>to</small> <span id="q-high">₹0</span></div>
    <div id="q-lines">${LINES.map(([a, b], i) => `<div class="qlr hide" id="ql-${i}"><span>${a}</span><b>${b}</b></div>`).join("")}</div>
    <div id="q-msg"><label>Message to send</label><div id="q-msg-t"></div></div>
    <div id="q-send">
      <div class="qbtn" id="qb-copy">${I.copy}<span id="qb-copy-t">Copy message</span></div>
      <div class="qbtn qbtn--quiet" id="qb-wa">${I.whatsapp}Open in WhatsApp ↗</div>
      <div class="qbtn qbtn--quiet" id="qb-mail">${I.mail}Open in email ↗</div>
    </div>
  </div>
  <div class="sheet qpanel" id="q-prices">
    <div id="qp-top"><h2>Your prices</h2><span id="qp-private"><i id="qp-lock">${I.lock}</i>Saved privately: only people signed in to this Studio can see them.</span></div>
    <div id="qp-rows">
      <div class="qgrid4">${field("One cameraman, one day (₹)", "qp-day")}${field("Fixed for each wedding (₹)", "qp-base")}${field("Travel, per person per day (₹)", "qp-travel")}${field("Tax (%)", "qp-tax")}</div>
    </div>
    <div class="qbtn" id="qp-save">Save prices</div>
  </div>
</div>`;

/* ---------- Good to know ---------- */
const PRESETS = ["WBSK – Album cover 3x7 (2800)", "WBSK – Card 4x5 (2000)", "WBSK – Desktop cover 21x9 (3000)", "WBSK – Mobile cover 3x4 (2000)", "WBSK – Gallery (3000)", "WBSK – Poster 16x9 (1920)", "WBSK – Hero poster desktop 16x9 (2560)", "WBSK – Hero poster mobile 9x16 (2400)", "WBSK – Team portrait B&amp;W 4x5 (2000)"];
const sizesHTML = `
<div class="scene" id="s-sizes">
  <div id="crop-photo">${tone(2, "")}</div>
  <div id="crop"><i class="c-a"></i><i class="c-b"></i><i class="c-c"></i><i class="c-d"></i><i class="crop__g1"></i><i class="crop__g2"></i></div>
  <div id="crop-ratio"><b id="crop-r">3:7</b><span id="crop-n">Album cover · 2800 px</span></div>
  <div class="sheet" id="presets"><small>Lightroom › Export presets</small><h3>Nine presets, saved once</h3>
    ${PRESETS.map((p, i) => `<div class="preset" id="pr-${i}"><i></i>${p}</div>`).join("")}
    <p>sRGB JPEG, quality 88. Nobody retypes a setting.</p>
  </div>
</div>`;
const downHTML = `
<div class="scene" id="s-down">
  ${[["Archive", I.box, "Older work.", "Off the lists and the homepage. Its own page still works for old links."], ["Remove from website", I.door, "When a couple asks.", "Gone everywhere. Its address leads back to the Weddings page."], ["Hide from website", I.eyeoff, "Films, reviews, team, roles.", "Not shown anywhere, until you switch it back."]].map(([t, ic, a, b], i) => `<div class="downcard sheet" id="dn-${i}"><div class="ico">${ic}</div><h3>${t}</h3><b>${a}</b><p>${b}</p></div>`).join("")}
  <div id="never">Never delete.</div>
</div>`;
const statusHTML = `
<div class="scene" id="s-status">
  ${record("st-rec")}
  <div class="sheet" id="st-pill"><i id="st-dot"></i><span id="st-words">Website live · updated 8 min ago</span></div>
  <div id="st-notes">
    <div class="stnote" id="sn-0"><i style="background:#5fbe82"></i><b>Green</b>Live. All is well.</div>
    <div class="stnote" id="sn-1"><i style="background:#ddaf3a"></i><b>Gold</b>Updating. The record spins faster.</div>
    <div class="stnote" id="sn-2"><i style="background:#d9634f"></i><b>Red</b>Didn’t update. Your work is safe. Press Try again.</div>
  </div>
</div>`;
const endHTML = `
<div class="scene" id="s-end">
  ${record("en-rec", "record--big")}
  <div id="en-a" class="title">${kinetic("Stuck?")}</div>
  <div id="en-cards">
    <div class="encard" id="en-guide"><div class="ico">${I.guide}</div><b>Open the Guide</b><span>Every step, written down.</span></div>
    <div class="encard" id="en-search"><div class="ico">${I.search}</div><b>Press ⌘K</b><span>Search for anything.</span></div>
  </div>
  <img id="en-logo" src="${LOGO}" alt="">
  <div id="en-b" class="title">${kinetic("Now go and add a wedding.", ["wedding."])}</div>
  <div id="en-c">A short film, starring you</div>
</div>`;

document.getElementById("stage").innerHTML = `
<div id="env"><i id="env-lamp"></i></div>
<div id="dust"></div>
<div id="cam"><div id="pan">
  ${openingHTML}${homeHTML}${editHTML}${sixHTML}${albumHTML}${spinHTML}${chatHTML}${quotesHTML}${sizesHTML}${downHTML}${statusHTML}${endHTML}
  <div id="dim"></div>
  <div id="ripples"></div>
  <div id="cursor"><svg id="cur-in" viewBox="0 0 42 42"><path d="M8 5v28l7.6-6.6 5 11.4 5.8-2.5-5-11.3H31z" fill="#fffdf9" stroke="#17100b" stroke-width="2.2" stroke-linejoin="round"/></svg></div>
</div></div>
<div id="over">
  <div id="keys"><div class="key" id="key-cmd">⌘</div><span>+</span><div class="key" id="key-k">K</div></div>

  <div id="moment">
    <i id="moment-glow"></i>
    <svg id="moment-tick" viewBox="0 0 200 200"><circle id="mt-ring" cx="100" cy="100" r="86" pathLength="1"/><path id="mt-path" d="M58 104 88 134 144 70" pathLength="1"/></svg>
    <div id="moment-a">${kinetic("Published.")}</div>
    <div id="moment-b">On the website in about 10 minutes</div>
    <div id="moment-link">View on website ↗</div>
    <div id="sparks"></div>
  </div>

  <div id="live">
    <div class="pv-nav"><img src="${LOGO}" alt=""></div>
    ${tone(5, "Sample: phone cover", "live__cover")}
    <div class="live__card"><small>DESTINATION · GOA</small><b>Sample Meera &amp;<br>Sample Arjun</b></div>
    <p class="live__story">Their story, live on the website, exactly as you wrote it.</p>
  </div>

  <div id="plate"><i id="plate-glow"></i></div>
  <div id="slats">${Array.from({ length: 16 }, (_, i) => `<i class="slat" style="left:${i * 120}px"></i>`).join("")}</div>
  <div id="strips">${Array.from({ length: 9 }, (_, i) => `<i class="strip" style="top:${i * 120}px"></i>`).join("")}</div>
  <div id="crops"><i id="cr-t"></i><i id="cr-b"></i><i id="cr-l"></i><i id="cr-r"></i></div>
  <div id="thread"></div>
  <div id="roller">${record("", "record--giant")}</div>

  <div id="slate">
    <div id="slate-rec">${record("slate-record")}</div>
    <div id="slate-sets"></div>
  </div>

  <div id="open-type">
    <div class="title" id="op-a">${kinetic("Everything on")}</div>
    <div class="title" id="op-c">${kinetic("your website")}</div>
    <div class="title" id="op-b">${kinetic("starts here.", ["here."])}</div>
    <div class="title" id="op-title">${kinetic("The WBSK Studio")}</div>
    <div id="op-sub">A short film, starring you</div>
  </div>

  <i id="sweep"></i>
  <i id="vig"></i>
  <i id="shade"></i>
  <div id="caps"></div>
  <div id="fade"></div>
  <div id="grain"></div>
</div>`;
