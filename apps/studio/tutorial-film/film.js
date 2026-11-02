/* The tutorial film: one paused GSAP timeline, sought frame by frame by render.mjs. Open
   film.html?play in a browser to watch it live. Nothing here ships with the Studio; only the rendered
   video does. Times are in seconds. */

const LOGO = "/apps/web/public/wbsk-logo.svg";
const icon = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const I = {
  home: icon('<path d="M4 11.2 12 4.5l8 6.7V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>'),
  content: icon('<rect x="4" y="4.5" width="16" height="15" rx="2.5"/><path d="M9.5 4.5v15M13 9h4M13 12.5h4"/>'),
  photos: icon('<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17 5-4.2 3.4 2.8 3-2.4L20 16.6"/>'),
  guide: icon('<path d="M5 5.2c2.6-1 5-.8 7 .8 2-1.6 4.4-1.8 7-.8v13.6c-2.6-1-5-.8-7 .8-2-1.6-4.4-1.8-7-.8z"/><path d="M12 6v13.6"/>'),
  search: icon('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>'),
  rings: icon('<circle cx="9" cy="14" r="5.2"/><circle cx="15" cy="14" r="5.2"/><path d="m7.5 4.5 1.5 2 1.5-2"/>'),
  film: icon('<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M7.5 5v14M16.5 5v14M3.5 9.5h4M3.5 14.5h4M16.5 9.5h4M16.5 14.5h4"/>'),
  quote: icon('<path d="M5 18c2.8-1 4.4-3.2 4.4-6V7H5v5h2.2M14 18c2.8-1 4.4-3.2 4.4-6V7H14v5h2.2"/>'),
  map: icon('<path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 0 0-13 0c0 5.4 6.5 11 6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'),
  play: icon('<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="m10 9 5 3-5 3z"/>'),
  role: icon('<rect x="4" y="8" width="16" height="11" rx="2.5"/><path d="M9 8V6.2A1.7 1.7 0 0 1 10.7 4.5h2.6A1.7 1.7 0 0 1 15 6.2V8M4 12.8h16"/>'),
  team: icon('<circle cx="9" cy="9" r="3.2"/><path d="M3.5 19c.4-3.2 2.6-5 5.5-5s5.1 1.8 5.5 5M15.5 6.2a3 3 0 0 1 0 5.6M17 14.3c2 .5 3.2 2.2 3.5 4.7"/>'),
  record: icon('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.4"/><path d="M12 6a6 6 0 0 1 6 6"/>'),
  star: icon('<path d="m12 4.5 2.3 4.8 5.2.7-3.8 3.6.9 5.2-4.6-2.5-4.6 2.5.9-5.2L4.5 10l5.2-.7z"/>'),
  form: icon('<rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M9 8.5h6M9 12h6M9 15.5h3.5"/>'),
  gear: icon('<circle cx="12" cy="12" r="2.8"/><path d="M12 3.8v2.4M12 17.8v2.4M3.8 12h2.4M17.8 12h2.4M6.2 6.2l1.7 1.7M16.1 16.1l1.7 1.7M6.2 17.8l1.7-1.7M16.1 7.9l1.7-1.7"/>'),
  pen: icon('<path d="m5 19 1-4L16 5l3 3L9 18zM14 7l3 3"/>'),
};
const TONES = [["#8e6f54", "#3b2c20"], ["#6b5442", "#2c2219"], ["#a58766", "#54402f"], ["#7c6250", "#35291f"], ["#b09374", "#62493a"]];
const tone = (i, label = "Sample", cls = "") => `<div class="tone ${cls}" style="--a:${TONES[i % 5][0]};--b:${TONES[i % 5][1]}">${label}</div>`;
const label = (id) => `<div class="label"${id ? ` id="${id}"` : ""}><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#DDAF3A"/><circle cx="50" cy="50" r="46" fill="none" stroke="#1F1914" stroke-opacity=".35" stroke-width=".6"/><defs><path id="arc-${id}" d="M50 50m-34 0a34 34 0 1 1 68 0a34 34 0 1 1-68 0"/></defs><text fill="#1F1914" font-family="Outfit" font-size="7.4" letter-spacing="2.5"><textPath href="#arc-${id}">WEDDINGS BY SIDDHANT KAPOOR · STUDIO ·</textPath></text><circle cx="50" cy="50" r="5" fill="#15100C"/></svg></div>`;
const words = (text) => text.split(" ").map((w) => `<span class="word">${w}</span>`).join(" ");

document.getElementById("stage").innerHTML = `
<div id="glow"></div>
<div id="cam"><div id="win">
  <div id="nav">
    <div class="brand"><img src="${LOGO}" alt=""><span>STUDIO</span></div>
    <div id="tools"><span id="toolpill"></span>
      <div class="tool" id="t-home">${I.home}Home</div><div class="tool" id="t-content">${I.content}Content</div><div class="tool" id="t-photos">${I.photos}Photos</div><div class="tool" id="t-guide">${I.guide}Guide</div><div class="tool">${I.play}Tutorials</div>
    </div>
    <div class="navright"><div class="navsearch">${I.search}Search or jump to…<i>⌘K</i></div><div id="status"><span id="dot"></span><span id="status-text">Website live · updated 8 min ago</span></div><div class="avatar">S</div></div>
  </div>

  <div class="view" id="v-home"><div id="home-inner">
    <div class="hero" id="hero"><h1>Good morning, Siddhant</h1><p>What would you like to do today?</p>
      <div class="spotbtn" id="spotbtn">${I.search}Add a wedding, a couple’s name, a page…<i>⌘K</i></div>
      <div class="record" id="rec-home">${label("lab-home")}</div></div>
    <div class="actions" id="actions">
      ${[["Add a wedding", "Names, three photos, gallery, films.", I.rings], ["Add a film", "YouTube link and poster.", I.film], ["Add a review", "A couple’s words, stars, approve.", I.quote], ["Add a pre-wedding shoot", "Pick its destination; its page fills itself.", I.map], ["Change a cover video", "Desktop, phone and two posters.", I.play], ["Update open roles", "Shown on Careers and in its form.", I.role]].map(([t, s, i]) => `<div class="action"><div class="ico">${i}</div><span><b>${t}</b><span>${s}</span></span></div>`).join("")}
    </div>
    <div class="panels">
      <div class="panel" id="p-wait"><h2>Waiting for you</h2>
        <div class="row"><div class="mark">${I.pen}</div><span>Sample Nina &amp; Sample Vir<small>Draft · 3 things left</small></span><span class="go">→</span></div>
        <div class="row"><div class="mark">${I.quote}</div><span>Review from Sample Zoya<small>Needs approval</small></span><span class="go">→</span></div></div>
      <div class="panel" id="p-worth"><h2>Worth a look</h2>
        <div class="row"><div class="mark">${I.star}</div><span>Google rating not updated for 60+ days</span><span class="go">Fix →</span></div>
        <div class="row"><div class="mark">${I.gear}</div><span>Backup email is empty</span><span class="go">Fix →</span></div></div>
      <div class="panel" id="p-last"><h2>Last published</h2>
        <div class="row">${tone(0, "", "thumb")}<span>Sample Asha &amp; Sample Kabir<small>2 hr ago · Live on the website ✓</small><small style="color:var(--gold)">Open page ↗</small></span></div></div>
    </div>
  </div></div>

  <div class="view hide" id="v-edit">
    <div id="side">
      <div class="sidehead">Website pages</div>
      <div class="sideitem">${I.home}Homepage</div><div class="sideitem on">${I.rings}Weddings</div><div class="sideitem">${I.film}Films</div><div class="sideitem">${I.record}Pre-wedding</div><div class="sideitem">${I.team}Our team</div><div class="sideitem">${I.role}Careers</div>
      <div class="sidehead" style="margin-top:12px">Couples’ words</div>
      <div class="sideitem">${I.quote}Reviews</div><div class="sideitem">${I.play}Reaction videos</div><div class="sideitem">${I.star}Featured on</div>
      <div class="sidehead" style="margin-top:12px">Forms</div>
      <div class="sideitem">${I.form}Enquiry forms</div>
      <div class="sidehead" style="margin-top:12px">Settings</div>
      <div class="sideitem">${I.gear}Site settings</div>
    </div>
    <div id="form">
      <div id="kicker">Wedding</div><h1 id="ed-title">New wedding</h1>
      <div id="tabs"><span id="tabpill"></span>
        ${["1 Couple", "2 Photos", "3 Story", "4 Films &amp; reels", "5 Homepage"].map((t, i) => `<div class="tab" id="tab-${i}">${t}<span class="tick" id="tick-${i}">✓</span></div>`).join("")}
      </div>

      <div class="step" id="st-couple">
        <div class="two"><div class="field"><label>First name</label><div class="input" id="f-first"><span id="f-first-t"></span></div></div>
        <div class="field"><label>Second name</label><div class="input" id="f-second"><span id="f-second-t"></span></div></div></div>
        <div class="field"><label>Place label</label><div class="radios"><span class="radio"><i class="sel"></i>Destination</span><span class="radio"><i></i>Local</span></div></div>
        <div class="two"><div class="field"><label>City</label><div class="input" id="f-city"><span id="f-city-t"></span></div></div>
        <div class="field"><label>Venue</label><div class="input" id="f-venue"><span id="f-venue-t"></span></div></div></div>
        <div class="field hide" id="addr-field"><label>Page address</label><div class="address">/client/meera-arjun/</div></div>
      </div>

      <div class="step hide" id="st-photos" style="top:248px">
        <div class="slots">
          <div class="slot" id="s-card" style="width:150px;height:188px"><span class="slotname">Card photo 4:5</span><div class="well">1600 × 2000</div><div class="ph1 hide">${tone(0)}</div></div>
          <div class="slot" id="s-cover" style="width:420px;height:180px"><span class="slotname">Desktop cover 21:9</span><div class="well">at least 2560 px wide</div><div class="ph1 hide">${tone(2)}</div></div>
          <div class="slot" id="s-phone" style="width:141px;height:188px"><span class="slotname">Phone cover 3:4</span><div class="well">1500 × 2000</div><div class="ph1 hide">${tone(3)}</div><div id="band" class="hide">Name label</div><div id="focus" class="hide"></div></div>
        </div>
        <div id="nope" class="hide"><b style="font-weight:500">This photo is too small for the desktop cover.</b> Please upload one at least 2560px wide. Yours was 1920 × 823.</div>
        <div id="tiny" class="hide">${tone(1, "1920 × 823")}</div>
        <div id="gal-label" class="hide">Gallery · <span id="gal-count">0</span> photos</div>
        <div id="gallery">${Array.from({ length: 28 }, (_, i) => `<div class="tone gt hide" style="--a:${TONES[i % 5][0]};--b:${TONES[i % 5][1]}">${i === 7 ? '<span id="gal-small" class="hide">Small</span>' : ""}</div>`).join("")}</div>
        <div id="desc-box" class="hide"><div class="field"><label>Description</label><div class="input on" id="f-desc"><span id="f-desc-t"></span></div></div></div>
      </div>

      <div class="step hide" id="st-story">
        <div class="field"><label>Short description</label><p>About 120 characters. Shown under the card.</p><div class="input" id="f-short"><span id="f-short-t"></span></div></div>
        <div class="field"><label>Their story</label><p>60 to 120 words.</p><div class="input" id="f-story" style="align-items:flex-start;height:180px"><span id="f-story-t"></span></div></div>
      </div>

      <div class="step hide" id="st-films">
        <div class="posters">${tone(1, "Poster 16:9")}<div class="field" style="margin:0"><label>Highlight film</label><div class="input" id="f-film"><span id="f-film-t"></span></div></div></div>
        <div class="field" style="margin-top:30px"><label>Instagram reel</label><div class="input"><span id="f-reel-t"></span><span class="chip" id="reel-chip" style="margin-left:auto;opacity:0">Sangeet</span></div></div>
      </div>

      <div class="step hide" id="st-featured">
        <div class="featrow"><div id="switch"><div id="switch-on" class="hide"></div><div id="knob"></div></div><span>Featured on the homepage</span></div>
        <div id="mini" class="hide">${tone(0)}<b id="mini-name">Meera &amp; Arjun</b></div>
      </div>

      <div id="bar">
        <svg id="ring" viewBox="0 0 58 58"><circle id="ring-track" cx="29" cy="29" r="24"/><circle id="ring-fill" cx="29" cy="29" r="24" stroke-dasharray="150.8" stroke-dashoffset="150.8"/><path id="ring-tick" class="hide" d="m19 30 7 7 13-15"/></svg>
        <div style="flex:1;min-width:0"><strong id="bar-state">New</strong>
          <div class="barset">
            <span id="b-new">Fill in each step. This bar lists what’s left.</span>
            <span id="b-left" class="hide">Before publishing:</span>
            <div class="chips hide" id="b-chips" style="left:150px"><span class="chip" id="chip-a">3 photo descriptions</span><span class="chip" id="chip-b">wedding date</span></div>
            <span id="b-ready" class="hide">Nothing left. Ready to publish.</span>
            <span id="b-pub" class="hide">Publishing… the website updates in a few minutes. You can keep working.</span>
            <span id="b-live" class="hide">Live on the website ✓ · <u>Open page ↗</u></span>
          </div></div>
      </div>
      <div id="foot"><span id="saved" class="hide">Saved</span><div id="pub"><div id="pub-lit" class="hide"></div><div id="pub-sheen"></div><b>Publish</b></div></div>
    </div>
    <div id="pv">
      <div id="pv-head"><span>PREVIEW · DRAFT</span><div class="seg"><span id="segpill"></span><span>Desktop</span><span>Phone</span></div></div>
      <div id="phone">
        <div class="pv-nav"><img src="${LOGO}" alt=""></div>
        <div id="pv-empty"></div><div id="pv-cover" class="hide">${tone(3, "Sample: phone cover").replace('class="tone "', 'class="tone" ').replace("<div ", '<div id="pv-tone" ')}</div>
        <div id="pv-card"><small>DESTINATION · <span id="pv-city">PLACE</span></small><span id="pv-names">First name &amp; Second name</span></div>
        <div id="pv-story">Their story appears here as you type.</div>
      </div>
      <div id="pv-desktop" class="hide">${tone(2, "Sample: desktop cover")}<div class="name">Meera &amp; Arjun</div></div>
    </div>
  </div>

  <div id="spot" class="hide"><div id="spot-panel">
    <div class="spotfield">${I.search}<span id="spot-ph" class="ph">Add a wedding, a couple’s name, a page…</span><span id="spot-t"></span></div>
    <div class="spotlist" style="height:390px;position:relative">
      <div class="spotset" id="set-0" style="top:0;padding:12px"><div class="spothead">Do something</div><div class="spotitem on"><div class="mark">${I.rings}</div>Add a wedding</div><div class="spotitem"><div class="mark">${I.film}</div>Add a film</div><div class="spotitem"><div class="mark">${I.quote}</div>Add a review</div><div class="spotitem"><div class="mark">${I.map}</div>Add a pre-wedding shoot</div></div>
      <div class="spotset hide" id="set-1" style="top:0;padding:12px"><div class="spothead">Found</div><div class="spotitem on">${tone(0, "")}<span>Sample Asha &amp; Sample Kabir<small>Wedding · Goa</small></span></div><div class="spotitem">${tone(1, "")}<span>Sample Asha &amp; Sample Kabir<small>Film · Highlight</small></span></div><div class="spotitem"><div class="mark">${I.quote}</div><span>Sample Asha &amp; Sample Kabir<small>Review</small></span></div></div>
      <div class="spotset hide" id="set-2" style="top:0;padding:12px"><div class="spothead">Do something</div><div class="spotitem on"><div class="mark">${I.rings}</div>Add a wedding</div><div class="spothead">Go to</div><div class="spotitem"><div class="mark">${I.rings}</div>Weddings</div></div>
    </div>
  </div></div>

  <div id="ringA" class="ring-call hide"></div>
  <div id="flash" class="hide"></div>
  <svg id="cursor" viewBox="0 0 42 42"><path d="M8 5v28l7.6-6.6 5 11.4 5.8-2.5-5-11.3H31z" fill="#fff" stroke="#15100c" stroke-width="2.2" stroke-linejoin="round"/></svg>
</div></div>

<div id="over">
  <div class="bigscene" id="open"><div class="glow2"></div>
    <div class="record" id="rec-big">${label("lab-big")}</div>
    <div class="title" id="o-1" style="top:388px;font-size:112px">${words("You don’t need a developer.")}</div>
    <div class="title" id="o-2" style="top:398px;font-size:96px">${words("You need two and a half minutes.")}</div>
    <div class="title" id="o-3" style="top:300px;font-size:150px">The WBSK Studio</div>
    <div class="sub" id="o-4" style="top:494px;font-family:'Playfair Display',serif;font-style:italic;font-size:44px;color:#ddaf3a">a very short film</div>
    <div class="credits" id="o-5"><div><b>STARRING</b>You</div><div><b>DIRECTED BY</b>Also you</div><div><b>SPECIAL EFFECTS</b>One Publish button</div></div>
  </div>

  <div class="keys hide" id="keys"><div class="key" id="key-cmd">⌘</div><span>+</span><div class="key" id="key-k">K</div></div>

  <div id="inter" class="hide"><div id="inter-frame"></div><h2>A few minutes later…</h2><p>(go on, make a chai)</p></div>
  <div id="live-phone" class="hide">
    <div class="pv-nav"><img src="${LOGO}" alt=""></div>
    <div style="position:absolute;left:0;right:0;top:58px;height:520px">${tone(3, "Sample: phone cover").replace('class="tone "', 'class="tone" style2="" ').replace("<div ", '<div style="position:absolute;inset:0" ')}</div>
    <div style="position:absolute;left:20px;right:20px;top:440px;padding:20px;background:var(--ivory);border-radius:8px"><small style="font-size:13px;letter-spacing:.2em;color:var(--gold)">DESTINATION · GOA</small><div style="margin-top:6px;font-family:'Playfair Display',serif;font-size:38px;line-height:1.1;font-weight:500">Meera &amp;<br>Arjun</div></div>
    <div style="position:absolute;left:24px;right:24px;top:640px;font-size:20px;line-height:1.5">Their story, live on the website, exactly as you wrote it.</div>
  </div>
  <div id="confetti"></div>

  <div id="jobs" class="hide"><div class="glow2" style="position:absolute;inset:-20%;background:radial-gradient(ellipse 44% 44% at 50% 44%,rgb(221 175 58 / .16),transparent 70%)"></div>
    <div class="title" id="jobs-title" style="top:64px;font-size:58px">And the everyday jobs</div>
    ${[["Add a film", "A YouTube link and a <b>16:9 poster</b>. Featured puts it on the homepage. Drag to set the order.", I.film], ["Add a review", "Ask the couple first. Then switch on <b>Approved</b>, or it stays off the website.", I.quote], ["Add a pre-wedding shoot", "Pick its destination and <b>the destination page fills itself.</b>", I.map], ["Change a cover video", "Replace <b>all four together:</b> desktop video, phone video and both posters.", I.play]].map(([t, s, i], n) => `<div class="job hide" id="job-${n}"><div class="ico">${i}</div><div><h3>${t}</h3><p>${s}</p></div></div>`).join("")}
    <div class="downs hide" id="downs">
      <div class="down"><h3>Archive</h3><p>For older work. Off the lists, but its page still works for old links.</p></div>
      <div class="down"><h3>Remove</h3><p>When a couple asks. Gone everywhere, and its address leads back to Weddings.</p></div>
      <div class="down"><h3>Hide</h3><p>For films, reviews, team and roles. Not shown anywhere until you switch it back.</p></div>
    </div>
    <div id="never" class="hide">Never delete.</div>
  </div>

  <div class="bigscene hide" id="rules"><div class="glow2"></div>
    <div class="title" id="r-1" style="top:230px;font-size:92px">${words("Drafts are safe.")}</div>
    <div class="title" id="r-2" style="top:390px;font-size:92px">${words("Nothing goes live until you press <em>Publish.</em>")}</div>
    <div class="title" id="r-3" style="top:550px;font-size:92px">${words("Stuck? Open the Guide.")}</div>
    <div class="title" id="r-4" style="top:370px;font-size:170px;font-style:italic;color:#ddaf3a">That’s a wrap.</div>
    <div class="sub" id="r-5" style="top:600px;font-size:38px">Now go and add a wedding.</div>
    <img id="r-logo" src="${LOGO}" alt="" style="position:absolute;left:50%;top:176px;height:64px;transform:translateX(-50%)">
  </div>

  <div id="wipe"></div>
  <div id="caps"></div>
  <div id="fade"></div>
</div>`;

gsap.defaults({ immediateRender: false, overwrite: false });
let seed = 20261102;
const random = (low, high) => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return low + (seed / 4294967296) * (high - low);
};
const tl = gsap.timeline({ paused: true });
const $ = (selector) => document.querySelector(selector);
const captions = [];
const cues = [];
const cue = (type, at, level = 1) => cues.push({ type, at: +at.toFixed(3), level });

/* Where things sit in the window; read once, before anything moves. */
const box = (selector) => {
  const element = $(selector);
  const win = $("#win").getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  return { x: rect.left - win.left, y: rect.top - win.top, w: rect.width, h: rect.height, cx: rect.left - win.left + rect.width / 2, cy: rect.top - win.top + rect.height / 2 };
};
const measured = {};
const remember = (...selectors) => {
  for (const selector of selectors) {
    const element = $(selector);
    const chain = [];
    for (let e = element; e && e.id !== "win"; e = e.parentElement) if (e.classList.contains("hide")) { chain.push(e); e.classList.remove("hide"); }
    measured[selector] = box(selector);
    chain.forEach((e) => e.classList.add("hide"));
  }
};
remember("#st-photos", "#t-home", "#t-content", "#t-guide", "#spotbtn", "#actions", "#p-wait", "#p-worth", "#p-last", "#status", "#f-first", "#f-second", "#f-city", "#f-venue", "#addr-field", "#tab-0", "#tab-1", "#tab-2", "#tab-3", "#tab-4", "#s-card", "#s-cover", "#s-phone", "#gallery", "#f-desc", "#f-short", "#f-story", "#f-film", "#knob", "#chip-a", "#pub", "#bar", "#phone", ".seg");
const m = (selector) => measured[selector];

/* Small moves */
const appear = (selector, at, duration = 0.6, from = { y: 24 }) => tl.fromTo(selector, { autoAlpha: 0, ...from }, { autoAlpha: 1, x: 0, y: 0, scale: 1, duration, ease: "expo.out" }, at);
const leave = (selector, at, duration = 0.35, to = {}) => tl.to(selector, { autoAlpha: 0, duration, ease: "power2.in", ...to }, at);
const on = (selector, at) => tl.set(selector, { autoAlpha: 1 }, at);
const off = (selector, at) => tl.set(selector, { autoAlpha: 0 }, at);

function camera(cx, cy, scale, at, duration = 1.1, extra = {}) {
  tl.to("#cam", { x: 960 - cx * scale, y: 540 - cy * scale, scale, duration, ease: "power3.inOut", rotationX: 0, rotationY: 0, ...extra }, at);
}
function cursorTo(x, y, at, duration = 0.75) {
  tl.to("#cursor", { x, y, duration, ease: "power3.inOut" }, at);
}
function click(x, y, at) {
  tl.to("#cursor", { scale: 0.82, duration: 0.09, ease: "power2.out" }, at).to("#cursor", { scale: 1, duration: 0.24, ease: "back.out(3)" }, at + 0.09);
  const ripple = document.createElement("div");
  ripple.className = "ripple hide";
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  $("#win").appendChild(ripple);
  tl.fromTo(ripple, { autoAlpha: 0.9, scale: 0.2 }, { autoAlpha: 0, scale: 1.5, duration: 0.55, ease: "expo.out" }, at);
  cue("click", at);
}
function type(selector, text, at, perChar = 0.05, caret) {
  const element = $(selector);
  const state = { n: 0 };
  const duration = text.length * perChar;
  tl.to(state, { n: text.length, duration, ease: "none", onUpdate() { element.textContent = text.slice(0, Math.round(state.n)); } }, at);
  for (let i = 0; i < text.length; i += 1) cue("key", at + i * perChar, 0.5);
  return at + duration;
}
function setText(selector, text, at) {
  const element = $(selector);
  const before = element.innerHTML;
  const state = { v: 0 };
  tl.to(state, { v: 1, duration: 0.001, onUpdate() { element.innerHTML = state.v >= 1 ? text : before; } }, at);
}
function lit(selector, isOn, at) {
  const element = $(selector);
  const state = { v: 0 };
  tl.to(state, { v: 1, duration: 0.001, onUpdate() { if (state.v >= 1) element.classList.toggle("on", isOn); } }, at);
}
function caption(html, at, duration = 3.2) {
  captions.push({ start: +at.toFixed(2), end: +(at + duration).toFixed(2), html });
}
/* One caption at a time: each gives way as the next arrives. */
function placeCaptions() {
  captions.sort((a, b) => a.start - b.start);
  captions.forEach((item, index) => {
    const next = captions[index + 1];
    if (next && item.end > next.start - 0.1) item.end = +(next.start - 0.1).toFixed(2);
    const element = document.createElement("div");
    element.className = "cap hide";
    element.innerHTML = item.html;
    $("#caps").appendChild(element);
    tl.fromTo(element, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "expo.out" }, item.start);
    tl.to(element, { autoAlpha: 0, y: -10, duration: 0.24, ease: "power2.in" }, item.end - 0.24);
    item.text = item.html.replace(/<[^>]+>/g, "");
    delete item.html;
    cue("soft", item.start, 0.35);
  });
}
function callout(selector, at, duration, pad = 10) {
  const b = m(selector);
  tl.set("#ringA", { left: b.x - pad, top: b.y - pad, width: b.w + pad * 2, height: b.h + pad * 2 }, at);
  tl.fromTo("#ringA", { autoAlpha: 0, scale: 1.05 }, { autoAlpha: 1, scale: 1, duration: 0.42, ease: "expo.out" }, at);
  tl.to("#ringA", { autoAlpha: 0, duration: 0.25 }, at + duration - 0.25);
}
function wipe(at) {
  tl.fromTo("#wipe", { x: "0%" }, { x: "100%", duration: 0.55, ease: "power4.inOut" }, at);
  tl.to("#wipe", { x: "210%", duration: 0.55, ease: "power4.inOut" }, at + 0.55);
  cue("whoosh", at + 0.1);
}
function ringTo(fraction, at) {
  tl.to("#ring-fill", { strokeDashoffset: 150.8 * (1 - fraction), duration: 0.9, ease: "power3.out" }, at);
  cue("tick", at + 0.15, 0.7);
}
function tabTo(index, at) {
  const a = m(`#tab-${index}`);
  const tabs = m("#tab-0").x - 5;
  tl.to("#tabpill", { x: a.x - tabs, width: a.w, duration: 0.55, ease: "back.out(1.3)" }, at);
}
function doneTab(index, at) {
  tl.fromTo(`#tick-${index}`, { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(2.4)" }, at);
}
function bigWords(selector, at, stagger = 0.11) {
  on(selector, at);
  tl.fromTo(`${selector} .word`, { autoAlpha: 0, y: 46, rotationX: -50 }, { autoAlpha: 1, y: 0, rotationX: 0, duration: 0.8, ease: "expo.out", stagger }, at);
}
const spin = (selector, turns, at, duration, ease = "none") => tl.to(selector, { rotation: `+=${turns * 360}`, duration, ease }, at);

/* First frame */
gsap.set("#over .title, #over .sub, #over .credits", { autoAlpha: 0 });
gsap.set("#rec-big", { y: 900, scale: 0.8 });
gsap.set("#cam", { x: 960 - 960 * 0.86, y: 540 - 540 * 0.86, scale: 0.86 });
gsap.set("#cursor", { x: 1200, y: 720 });
gsap.set("#fade", { autoAlpha: 1 });
gsap.set("#tabpill", { x: 5, width: m("#tab-0").w });
gsap.set("#pub-sheen", { x: 0 });
const pillX = (tool) => m(tool).x - m("#t-home").x + 4;
gsap.set("#toolpill", { x: pillX("#t-home") });

const chapters = [];
const chapter = (title, at) => chapters.push({ title, at });

/* The record never quite stops turning. */
spin("#lab-big", 12, 0, 20, "none");
spin("#lab-home", 36, 12, 150, "none");

/* ---------- 0. Cold open ---------- */
let t = 0;
chapter("Welcome", 0);
tl.to("#fade", { autoAlpha: 0, duration: 1.1, ease: "power2.out" }, t + 0.15);
tl.to("#rec-big", { y: 0, scale: 1, duration: 1.5, ease: "expo.out" }, t + 0.2);
cue("needle", t + 0.9);
tl.to("#rec-big", { x: 0, y: -40, scale: 2.2, autoAlpha: 0.2, duration: 1.1, ease: "power3.inOut" }, t + 2);
bigWords("#o-1", t + 2.25);
tl.to("#o-1 .word", { autoAlpha: 0, y: -30, duration: 0.3, stagger: 0.03, ease: "power2.in" }, t + 4.45);
bigWords("#o-2", t + 4.85);
cue("swell", t + 2.2);
tl.to("#o-2 .word", { autoAlpha: 0, y: -30, duration: 0.3, stagger: 0.03, ease: "power2.in" }, t + 6.75);
tl.to("#rec-big", { autoAlpha: 0.07, duration: 0.5 }, t + 6.8);
tl.fromTo("#o-3", { autoAlpha: 0, scale: 1.2, letterSpacing: "0.1em" }, { autoAlpha: 1, scale: 1, letterSpacing: "-0.012em", duration: 1.2, ease: "expo.out" }, t + 7.05);
appear("#o-4", t + 7.65);
appear("#o-5", t + 8.1);
cue("hit", t + 7.05);

/* ---------- 1. Home ---------- */
t = 10.6;
chapter("Your home screen", t);
wipe(t);
off("#open", t + 0.55);
tl.fromTo("#hero", { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, ease: "expo.out" }, t + 0.6);
tl.fromTo("#actions .action", { y: 40, autoAlpha: 0, scale: 0.96 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.8, stagger: 0.07, ease: "expo.out" }, t + 0.8);
tl.fromTo(".panel", { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.1, ease: "expo.out" }, t + 1.2);
cursorTo(1300, 690, t + 0.6, 0.1);
caption("Every morning <em>starts here.</em>", t + 1.1, 3.2);
callout("#actions", t + 4.3, 3.2, 12);
camera(960, 400, 1, t + 4.2, 1.1);
caption("Six big buttons for what you do most.", t + 4.4, 3.1);
cursorTo(m("#actions").x + 280, m("#actions").y + 56, t + 4.4, 1);
callout("#p-wait", t + 7.6, 2.9);
camera(m("#p-wait").cx + 200, m("#p-wait").cy - 60, 1.3, t + 7.4, 1);
caption("Unfinished things wait here for you.", t + 7.65, 2.9);
cursorTo(m("#p-wait").cx, m("#p-wait").cy, t + 7.6, 0.8);
callout("#p-worth", t + 10.5, 2.8);
caption("Small fixes. No panic.", t + 10.55, 2.8);
cursorTo(m("#p-worth").cx, m("#p-worth").cy, t + 10.4, 0.8);
callout("#p-last", t + 13.3, 2.8);
camera(1000, m("#p-last").cy - 60, 1.3, t + 13.1, 0.9);
caption("And what’s live on the website.", t + 13.35, 2.8);
cursorTo(m("#p-last").cx, m("#p-last").cy, t + 13.2, 0.8);
callout("#status", t + 16.1, 2.8, 12);
camera(1560, 200, 1.5, t + 15.9, 1);
caption("A green dot up here means all is well.", t + 16.15, 2.8);
cursorTo(m("#status").cx - 40, m("#status").cy + 40, t + 16, 0.8);
camera(960, 540, 0.9, t + 18.9, 1.1);

/* ---------- 2. Search ---------- */
t = 30.3;
chapter("Search with ⌘K", t);
caption("Lost? Two keys, anywhere. (Ctrl + K on Windows.)", t, 3.2);
tl.fromTo("#keys", { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.7, ease: "back.out(1.6)" }, t + 0.25);
tl.to("#key-cmd", { y: 14, duration: 0.1 }, t + 1.2).to("#key-cmd", { y: 0, duration: 0.3, ease: "back.out(3)" }, t + 2.15);
tl.to("#key-k", { y: 14, duration: 0.1 }, t + 1.55).to("#key-k", { y: 0, duration: 0.3, ease: "back.out(3)" }, t + 2.15);
cue("key", t + 1.2, 1);
cue("key", t + 1.55, 1);
leave("#keys", t + 2.5, 0.3, { scale: 1.3 });
tl.fromTo("#spot", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, t + 2.6);
tl.fromTo("#spot-panel", { y: -30, scale: 0.95 }, { y: 0, scale: 1, duration: 0.55, ease: "back.out(1.4)" }, t + 2.6);
cue("pop", t + 2.6);
camera(960, 450, 1.05, t + 2.6, 0.9);
off("#spot-ph", t + 3.6);
let end = type("#spot-t", "asha", t + 3.6, 0.13);
off("#set-0", end);
on("#set-1", end);
caption("Type a couple’s name…", t + 3.3, 2.9);
tl.to("#spot-t", { autoAlpha: 0, duration: 0.15 }, t + 6.25);
off("#set-1", t + 6.4);
on("#set-2", t + 6.4);
tl.set("#spot-t", { autoAlpha: 1 }, t + 6.42);
setText("#spot-t", "", t + 6.41);
const secondTyping = { n: 0 };
tl.to(secondTyping, { n: 11, duration: 0.8, ease: "none", onUpdate() { $("#spot-t").textContent = "add wedding".slice(0, Math.round(secondTyping.n)); } }, t + 6.45);
for (let i = 0; i < 11; i += 1) cue("key", t + 6.45 + i * 0.072, 0.5);
caption("…or a job. Press return, and you’re there.", t + 6.4, 3.1);
cue("pop", t + 8.8);

/* ---------- 3. Couple ---------- */
t = 39.7;
chapter("Add a wedding", t);
wipe(t - 0.55);
off("#spot", t);
off("#v-home", t);
on("#v-edit", t);
tl.to("#toolpill", { x: pillX("#t-content"), duration: 0.6, ease: "back.out(1.3)" }, t + 0.2);
camera(960, 540, 0.96, t, 0.9);
caption("Five steps. <em>Any order you like.</em>", t + 0.4, 3);
tl.fromTo("#tabs", { y: 14 }, { y: 0, duration: 0.6, ease: "expo.out" }, t);
for (let i = 0; i < 5; i += 1) tl.to(`#tab-${i}`, { y: -6, duration: 0.14, ease: "power2.out" }, t + 0.9 + i * 0.14).to(`#tab-${i}`, { y: 0, duration: 0.3, ease: "back.out(3)" }, t + 1.04 + i * 0.14);
cursorTo(m("#f-first").cx, m("#f-first").cy, t + 2.5, 0.7);
click(m("#f-first").cx, m("#f-first").cy, t + 3.2);
lit("#f-first", true, t + 3.2);
end = type("#f-first-t", "Meera", t + 3.3, 0.09);
setText("#ed-title", "Meera", end - 0.2);
setText("#pv-names", "Meera &amp; Second name", end - 0.2);
lit("#f-first", false, end + 0.15);
caption("Watch the preview: <em>it types along with you.</em>", t + 3.2, 3.4);
lit("#f-second", true, end + 0.15);
const afterFirst = end;
end = type("#f-second-t", "Arjun", end + 0.3, 0.09);
setText("#ed-title", "Meera &amp; Arjun", end - 0.1);
setText("#pv-names", "Meera &amp; Arjun", end - 0.1);
lit("#f-second", false, end + 0.1);
ringTo(0.05, afterFirst);
setText("#bar-state", "Draft · not on the website yet", afterFirst);
on("#saved", afterFirst + 0.3);
off("#b-new", afterFirst);
on("#b-left", afterFirst);
on("#b-chips", afterFirst);
setText("#chip-a", "card photo", afterFirst);
appear("#addr-field", end + 0.4);
callout("#addr-field", end + 0.5, 2.6, 6);
caption("The page address writes itself.", end + 0.5, 2.6);
cue("pop", end + 0.45);
const cityAt = end + 3.1;
lit("#f-city", true, cityAt);
end = type("#f-city-t", "Goa", cityAt, 0.07);
setText("#pv-city", "GOA", end);
lit("#f-city", false, end);
lit("#f-venue", true, end);
end = type("#f-venue-t", "Sample Beach House", end + 0.1, 0.03);
lit("#f-venue", false, end + 0.1);
caption("It saves itself as a draft. Drafts never go live.", cityAt, 3.2);
doneTab(0, cityAt + 2.5);
ringTo(0.2, cityAt + 2.5);
cue("tick", cityAt + 2.5);

/* ---------- 4. Photos ---------- */
t = cityAt + 3.3;
const photosAt = t;
chapter("Photos", t);
cursorTo(m("#tab-1").cx, m("#tab-1").cy, t - 0.6, 0.6);
click(m("#tab-1").cx, m("#tab-1").cy, t);
tabTo(1, t);
leave("#st-couple", t, 0.2);
appear("#st-photos", t + 0.15, 0.5, { y: 14 });
caption("Three photos, each with its own shape.", t + 0.3, 3);
tl.fromTo(".slot", { y: 34, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.12, ease: "expo.out" }, t + 0.3);
camera(m("#s-cover").cx, m("#s-cover").cy + 180, 1.14, t + 0.5, 1);

// A photo that's too small gets a polite no.
t += 3.3;
const coverX = m("#s-cover").x - m("#st-photos").x;
gsap.set("#tiny", { left: 330, top: 300 });
const tinyAt = t;
appear("#tiny", t, 0.4, { scale: 0.7 });
tl.set("#cursor", { x: m("#s-cover").x + 430, y: m("#s-cover").y + 340 }, t);
tl.to("#tiny", { left: coverX + 110, top: 40, rotation: -3, duration: 0.85, ease: "power3.inOut" }, t + 0.25);
cursorTo(m("#s-cover").cx + 40, m("#s-cover").cy, t + 0.25, 0.85);
tl.to("#tiny", { x: 26, duration: 0.07, repeat: 5, yoyo: true, ease: "none" }, t + 1.15);
tl.to("#tiny", { x: 0, top: 330, left: 620, rotation: 22, autoAlpha: 0, duration: 0.6, ease: "power2.in" }, t + 1.65);
cue("nope", t + 1.15);
appear("#nope", t + 1.3, 0.5, { y: 12 });
caption("Too small? The Studio says no. <em>Politely.</em>", t + 1.3, 3.4);
leave("#nope", t + 4.3);

// The right ones land, and the focal point.
t += 4.7;
const landed = (selector, at) => {
  tl.fromTo(`${selector} .ph1`, { autoAlpha: 0, scale: 1.15 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: "expo.out" }, at);
  cue("pop", at, 0.8);
};
landed("#s-cover", t);
landed("#s-card", t + 0.3);
landed("#s-phone", t + 0.6);
on("#pv-cover", t + 0.6);
off("#pv-empty", t + 0.6);
ringTo(0.3, t + 0.6);
cursorTo(m("#s-phone").cx, m("#s-phone").y + 64, t + 1, 0.7);
camera(m("#s-phone").cx - 40, m("#s-phone").cy + 90, 1.7, t + 1, 1);
click(m("#s-phone").cx, m("#s-phone").y + 64, t + 1.75);
appear("#focus", t + 1.75, 0.5, { scale: 1.8 });
appear("#band", t + 2.2, 0.5, { y: 12 });
caption("Click on the couple. Keep faces above the pale band.", t + 1.9, 3.6);

// The gallery rains in.
t += 5.5;
camera(960, 620, 1.02, t - 0.2, 1);
appear("#gal-label", t, 0.4);
tl.fromTo(".gt", { y: -520, rotation: () => random(-18, 18), autoAlpha: 1, scale: 0.9 }, { y: 0, rotation: 0, autoAlpha: 1, scale: 1, duration: 0.9, ease: "bounce.out", stagger: 0.035 }, t);
const counted = { n: 0 };
tl.to(counted, { n: 56, duration: 1.5, ease: "power1.out", onUpdate() { $("#gal-count").textContent = Math.round(counted.n); } }, t);
for (let i = 0; i < 14; i += 1) cue("patter", t + i * 0.09, 0.55);
caption("Drop 50 or 60 at once. Then drag to reorder.", t + 0.2, 3.2);
const g = m("#gallery");
const tile = g.w / 14;
const firstTile = ".gt:nth-child(3)";
const otherTile = ".gt:nth-child(6)";
cursorTo(g.x + tile * 2.5, g.y + tile * 0.5, t + 1.6, 0.5);
tl.to(firstTile, { x: tile * 3, y: -12, scale: 1.1, zIndex: 3, duration: 0.7, ease: "power3.inOut" }, t + 2.1);
tl.to(otherTile, { x: -tile * 3, duration: 0.7, ease: "power3.inOut" }, t + 2.1);
tl.to(firstTile, { y: 0, scale: 1, duration: 0.3, ease: "back.out(2)" }, t + 2.8);
cursorTo(g.x + tile * 5.5, g.y + tile * 0.5, t + 2.1, 0.7);
appear("#gal-small", t + 3.1, 0.4, { scale: 1.5 });

// Every photo needs words.
t += 3.7;
const descAt = t;
appear("#desc-box", t, 0.5, { y: 16 });
camera(m("#f-desc").cx, m("#f-desc").cy - 70, 1.2, t - 0.1, 0.9);
caption("Every photo needs a description. <em>Yes, every one.</em>", t + 0.1, 3.5);
end = type("#f-desc-t", "Meera and Arjun laughing during the varmala, Goa", t + 0.35, 0.052);
const barCount = { n: 56 };
setText("#chip-a", "56 photo descriptions", t);
tl.to(barCount, { n: 3, duration: 3.6, ease: "power2.in", onUpdate() { $("#chip-a").textContent = `${Math.round(barCount.n)} photo descriptions`; } }, t + 3.2);
caption("Allow 10 to 15 minutes. Put some music on.", t + 3.65, 3);
doneTab(1, t + 6.2);
ringTo(0.5, t + 6.2);

/* ---------- 5. Story, films, featured ---------- */
t += 6.9;
chapter("Story, films and Featured", t);
tabTo(2, t);
click(m("#tab-2").cx, m("#tab-2").cy, t);
tl.to("#cursor", { x: m("#tab-2").cx, y: m("#tab-2").cy, duration: 0.5, ease: "power3.inOut" }, t - 0.5);
leave("#st-photos", t, 0.2);
appear("#st-story", t + 0.15, 0.5, { y: 14 });
camera(960, 540, 0.96, t, 0.8);
caption("A line for the card, and their story.", t + 0.3, 3);
lit("#f-short", true, t + 0.5);
end = type("#f-short-t", "A quiet seaside wedding, with family close.", t + 0.5, 0.032);
lit("#f-short", false, end);
lit("#f-story", true, end);
const storyText = "We stayed near, kept quiet, and let Goa do what it does at the end of a long day.";
end = type("#f-story-t", storyText, end + 0.05, 0.016);
setText("#pv-story", storyText, end);
lit("#f-story", false, end + 0.1);
doneTab(2, end + 0.3);
ringTo(0.68, end + 0.3);

t = end + 0.8;
tabTo(3, t);
tl.to("#cursor", { x: m("#tab-3").cx, y: m("#tab-3").cy, duration: 0.5, ease: "power3.inOut" }, t - 0.5);
click(m("#tab-3").cx, m("#tab-3").cy, t);
leave("#st-story", t, 0.2);
appear("#st-films", t + 0.15, 0.5, { y: 14 });
caption("Films are YouTube links. Each with its 16:9 poster.", t + 0.3, 3);
lit("#f-film", true, t + 0.5);
end = type("#f-film-t", "youtube.com/watch?v=meera-arjun", t + 0.5, 0.03);
lit("#f-film", false, end);
end = type("#f-reel-t", "instagram.com/reel/sangeet", end + 0.1, 0.025);
tl.to("#reel-chip", { opacity: 1, duration: 0.3 }, end);
doneTab(3, end + 0.2);
ringTo(0.84, end + 0.2);

t = end + 0.9;
tabTo(4, t);
tl.to("#cursor", { x: m("#tab-4").cx, y: m("#tab-4").cy, duration: 0.5, ease: "power3.inOut" }, t - 0.5);
click(m("#tab-4").cx, m("#tab-4").cy, t);
leave("#st-films", t, 0.2);
appear("#st-featured", t + 0.15, 0.5, { y: 14 });
caption("One switch puts them on the homepage.", t + 0.3, 3.4);
tl.to("#cursor", { x: m("#tab-1").x + 130, y: m("#tab-0").y + 150, duration: 0.7, ease: "power3.inOut" }, t + 0.4);
const switchAt = t + 1.2;
click(m("#tab-1").x + 130, m("#tab-0").y + 150, switchAt);
tl.to("#knob", { x: 50, duration: 0.45, ease: "back.out(2.4)" }, switchAt);
tl.fromTo("#switch-on", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, switchAt);
tl.fromTo("#mini", { autoAlpha: 0, y: 70, rotation: -6, scale: 0.8 }, { autoAlpha: 1, y: 0, rotation: 2, scale: 1, duration: 0.9, ease: "back.out(1.6)" }, switchAt + 0.1);
cue("pop", switchAt + 0.1);
doneTab(4, switchAt + 0.6);
ringTo(0.9, switchAt + 0.6);

/* ---------- 6. What's left ---------- */
t = switchAt + 2.4;
chapter("What’s left", t);
camera(m("#bar").cx, m("#bar").cy - 120, 1.32, t - 0.1, 1);
caption("Not sure what’s left? The bar always knows.", t + 0.1, 3.1);
callout("#bar", t + 0.3, 2.9, 6);
const chipA = m("#chip-a");
cursorTo(chipA.cx, chipA.cy, t + 2.4, 0.7);
click(chipA.cx, chipA.cy, t + 3.15);
caption("Click anything on it, and it takes you there.", t + 3.3, 3);
const chipAt = t + 3.2;
tabTo(1, chipAt);
leave("#st-featured", chipAt, 0.2);
appear("#st-photos", chipAt + 0.15, 0.4, { y: 12 });
const left = { n: 3 };
tl.to(left, { n: 0, duration: 1.4, ease: "none", onUpdate() { $("#chip-a").textContent = `${Math.round(left.n)} photo descriptions`; } }, chipAt + 1);
tl.to("#chip-a", { autoAlpha: 0, scale: 0.8, duration: 0.25 }, chipAt + 2.4);
tl.to("#chip-b", { x: -210, duration: 0.4, ease: "power3.out" }, chipAt + 2.5);
tl.to("#chip-b", { autoAlpha: 0, scale: 0.8, duration: 0.25 }, chipAt + 3.2);
off("#b-left", chipAt + 3.4);
off("#b-chips", chipAt + 3.4);
appear("#b-ready", chipAt + 3.4, 0.4, { y: 6 });
ringTo(1, chipAt + 3.4);
appear("#ring-tick", chipAt + 3.9, 0.4, { scale: 0.6 });
tl.to("#pub-lit", { autoAlpha: 1, duration: 0.5 }, chipAt + 3.5);
cue("chime", chipAt + 3.45);
caption("Then check the desktop view. Only you can see drafts.", chipAt + 3.3, 3.3);
const seg = m(".seg");
tl.to("#cursor", { x: seg.x + 50, y: seg.cy, duration: 0.7, ease: "power3.inOut" }, chipAt + 3.8);
camera(1460, 340, 1.2, chipAt + 3.6, 1);
click(seg.x + 50, seg.cy, chipAt + 4.5);
tl.to("#segpill", { x: -84, duration: 0.45, ease: "back.out(1.5)" }, chipAt + 4.5);
tl.to("#phone", { autoAlpha: 0, scale: 0.93, duration: 0.3 }, chipAt + 4.5);
tl.fromTo("#pv-desktop", { autoAlpha: 0, scale: 1.05 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "expo.out" }, chipAt + 4.7);

/* ---------- 7. Publish ---------- */
t = chipAt + 7;
chapter("Publish", t);
camera(m("#pub").cx - 120, m("#pub").cy - 70, 2, t, 1.2);
caption("And now, <em>the big moment.</em>", t + 0.2, 3);
tl.to("#cursor", { x: m("#pub").cx, y: m("#pub").cy, duration: 1.1, ease: "power3.inOut" }, t + 0.8);
tl.to("#pub-sheen", { x: 340, duration: 0.9, ease: "power2.inOut" }, t + 0.5);
tl.set("#pub-sheen", { x: 0 }, t + 1.45);
tl.to("#pub-sheen", { x: 340, duration: 0.9, ease: "power2.inOut" }, t + 1.5);
const pressAt = t + 2.5;
tl.to("#pub", { scale: 0.92, duration: 0.09 }, pressAt).to("#pub", { scale: 1, duration: 0.4, ease: "back.out(3)" }, pressAt + 0.09);
click(m("#pub").cx, m("#pub").cy, pressAt);
tl.set("#flash", { left: m("#pub").cx, top: m("#pub").cy }, pressAt);
tl.fromTo("#flash", { autoAlpha: 1, scale: 0.4 }, { autoAlpha: 0, scale: 30, duration: 1.1, ease: "expo.out" }, pressAt);
cue("hit", pressAt);
tl.to("#pub-lit", { autoAlpha: 0, duration: 0.5 }, pressAt + 0.7);
off("#b-ready", pressAt + 0.2);
appear("#b-pub", pressAt + 0.2, 0.4, { y: 6 });
setText("#bar-state", "On the website", pressAt + 0.2);
tl.set("#dot", { background: "#ddaf3a", boxShadow: "0 0 0 4px rgb(221 175 58 / 0.22)" }, pressAt + 0.3);
setText("#status-text", "Website updating…", pressAt + 0.3);
camera(1100, 500, 0.98, pressAt + 0.4, 1.1);
caption("It takes a few minutes. Keep working if you like.", pressAt + 0.7, 3);

// The silent-film card.
t = pressAt + 3.8;
tl.fromTo("#inter", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, t);
cue("clock", t);
tl.fromTo("#inter h2", { scale: 1.08 }, { scale: 1, duration: 2.4, ease: "power2.out" }, t);
leave("#inter", t + 2.45, 0.25);
off("#b-pub", t + 2.4);
on("#b-live", t + 2.4);
tl.set("#dot", { background: "#5fbe82", boxShadow: "0 0 0 4px rgb(95 190 130 / 0.18)" }, t + 2.4);
setText("#status-text", "Website live · updated just now", t + 2.4);
const liveAt = t + 2.8;
cue("chime", liveAt);
caption("Live on the website. <em>Well done, you.</em>", liveAt, 2.6);
camera(m("#bar").cx - 40, m("#bar").cy - 60, 1.32, t + 2.5, 0.8);

const confetti = $("#confetti");
for (let i = 0; i < 70; i += 1) {
  const piece = document.createElement("div");
  piece.className = "confetti hide";
  piece.style.background = ["#ddaf3a", "#f5efe6", "#8b6a1d", "#c99a2e"][i % 4];
  confetti.appendChild(piece);
  const x = random(120, 1800);
  tl.fromTo(piece, { autoAlpha: 1, x, y: -60, rotation: random(0, 360) }, { y: 1160, x: x + random(-140, 140), rotation: random(360, 1080), duration: random(1.6, 2.8), ease: "power1.in" }, liveAt + random(0, 0.8));
}

t = liveAt + 2.75;
appear("#live-phone", t, 0.8, { y: 900 });
tl.to("#cam", { scale: 0.8, autoAlpha: 0.25, duration: 0.8, ease: "power3.inOut", x: 960 - 960 * 0.8, y: 540 - 540 * 0.8 }, t);
caption("Then look at it on your phone. Always.", t + 0.3, 3);
cue("whoosh", t, 0.8);

/* ---------- 8. Everyday jobs ---------- */
t += 3.3;
chapter("Everyday jobs", t);
wipe(t - 0.55);
on("#jobs", t);
off("#live-phone", t);
tl.set("#cam", { autoAlpha: 0 }, t);
appear("#jobs-title", t + 0.1, 0.6);
const cardTime = 3.3;
for (let i = 0; i < 4; i += 1) {
  const at = t + 0.3 + i * cardTime;
  tl.fromTo(`#job-${i}`, { autoAlpha: 1, x: 1500, rotation: 5 }, { x: 0, rotation: 0, duration: 0.8, ease: "expo.out" }, at);
  tl.to(`#job-${i}`, { x: -1600, rotation: -5, duration: 0.55, ease: "power3.in", autoAlpha: 1 }, at + cardTime - 0.3);
  cue("whoosh", at, 0.55);
}
const downsAt = t + 0.3 + 4 * cardTime;
chapter("Taking things down", downsAt);
setText("#jobs-title", "Taking something down?", downsAt);
tl.fromTo("#downs", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, downsAt);
tl.fromTo(".down", { y: 500, rotation: () => random(-4, 4) }, { y: 0, rotation: 0, duration: 0.9, stagger: 0.13, ease: "expo.out" }, downsAt);
caption("Nothing you take down is lost. Switch it back on any time.", downsAt + 0.5, 3.9);
tl.fromTo("#never", { autoAlpha: 0, scale: 2.4 }, { autoAlpha: 1, scale: 1, duration: 0.42, ease: "back.out(1.8)" }, downsAt + 4.4);
cue("hit", downsAt + 4.55);
caption("That one’s for the owner only.", downsAt + 4.9, 2.1);

/* ---------- 9. Golden rules ---------- */
t = downsAt + 7.2;
chapter("Three golden rules", t);
wipe(t - 0.55);
on("#rules", t);
off("#jobs", t);
gsap.set("#r-logo", { autoAlpha: 0 });
bigWords("#r-1", t + 0.25);
bigWords("#r-2", t + 1.75, 0.07);
bigWords("#r-3", t + 3.7);
cue("soft", t + 0.25);
cue("soft", t + 1.75);
cue("soft", t + 3.7);
tl.to("#r-1 .word, #r-2 .word, #r-3 .word", { autoAlpha: 0, y: -24, duration: 0.3, stagger: 0.012, ease: "power2.in" }, t + 6);
tl.fromTo("#r-4", { autoAlpha: 0, scale: 1.3 }, { autoAlpha: 1, scale: 1, duration: 1, ease: "expo.out" }, t + 6.5);
appear("#r-5", t + 7.2);
appear("#r-logo", t + 6.8);
cue("end", t + 6.5);
const FILM_END = t + 11;
tl.to("#fade", { autoAlpha: 1, duration: 1.3, ease: "power1.in" }, FILM_END - 1.4);
tl.set({}, {}, FILM_END);

placeCaptions();
window.FILM = { duration: FILM_END, captions, chapters, cues };
window.seekFilm = (time) => {
  tl.time(time, false);
  return document.fonts.ready.then(() => true);
};
window.filmReady = Promise.all([document.fonts.ready, ...[...document.images].map((image) => image.decode().catch(() => null))]);
if (location.search.includes("play")) tl.play();
else tl.time(0, false);
