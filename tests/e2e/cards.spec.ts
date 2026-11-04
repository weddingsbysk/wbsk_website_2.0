import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const width = (page: Page) => page.viewportSize()?.width ?? 0;
const isPhone = (page: Page) => width(page) < 760;
const offset = (page: Page) =>
  page.locator(".wbsk-drift__track").evaluate((el) => {
    const t = getComputedStyle(el).transform;
    return t === "none" ? 0 : new DOMMatrixReadOnly(t).m41;
  });

async function gotoRow(page: Page, search = "") {
  await page.goto(`./${search}`);
  const row = page.locator(".wbsk-drift");
  await row.scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const el = document.querySelector(".wbsk-drift")!;
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 120);
  });
  return row;
}
/** Waits until the row has really come to rest, however busy the machine is. */
const settled = async (page: Page) => {
  let last = await offset(page);
  await expect
    .poll(
      async () => {
        const now = await offset(page);
        const change = Math.abs(now - last);
        last = now;
        return change;
      },
      { timeout: 15000, intervals: [400] },
    )
    .toBeLessThan(0.6);
};
/** Safari moves between links with Option+Tab unless its setting says otherwise. */
const tabKey = (browserName: string, shift = false) => `${shift ? "Shift+" : ""}${browserName === "webkit" ? "Alt+" : ""}Tab`;
const driftReady = async (page: Page) => {
  await expect(page.locator(".wbsk-drift")).toHaveAttribute("data-mode", "drift", { timeout: 15000 });
};

test.beforeEach(async ({ page }) => {
  test.slow();
  await page.addInitScript(() => sessionStorage.setItem("wbsk-intro-skip-for-tests", "1"));
});

test.describe("the card (Decision 05)", () => {
  test("one link with a full name, a clean photo and a left-aligned caption", async ({ page }) => {
    await page.goto("./weddings/");
    const card = page.locator(".wbsk-card").first();
    const link = card.locator(".wbsk-card__link");
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute("aria-label", /^Sample .* & Sample .*, (Destination|Local) · .*: view story$/);
    await expect(card.locator(".wbsk-card__photo .wbsk-frame")).toHaveCSS("border-radius", "0px");
    expect(await card.locator(".wbsk-card__clip").evaluate((el) => el.textContent)).toBe("");
    await expect(card.locator(".wbsk-card__caption")).toHaveCSS("text-align", "left");
    const ratio = await card.locator(".wbsk-card__clip").evaluate((el) => el.getBoundingClientRect().width / el.getBoundingClientRect().height);
    expect(ratio).toBeCloseTo(0.8, 1);
  });

  test("hover lifts it, zooms slowly, shows the invitation, and it all comes back", async ({ page }) => {
    test.skip(isPhone(page), "Phones have no hover.");
    await page.goto("./weddings/");
    const card = page.locator(".wbsk-card").first();
    await card.scrollIntoViewIfNeeded();
    const y = () => card.locator(".wbsk-card__link").evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m42);
    const scale = () => card.locator(".wbsk-frame").evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).a);
    await card.locator(".wbsk-card__link").hover();
    await expect.poll(y, { timeout: 5000 }).toBeCloseTo(-6, 0);
    await expect.poll(scale, { timeout: 5000 }).toBeCloseTo(1.045, 2);
    await expect(card.locator(".wbsk-card__more")).toHaveCSS("opacity", "1");
    await page.mouse.move(2, 2);
    await expect(card.locator(".wbsk-card__more")).toHaveCSS("opacity", "0", { timeout: 5000 });
    await expect.poll(y, { timeout: 5000 }).toBeCloseTo(0, 0);
  });

  test("keyboard focus shows the same state with a visible ring", async ({ page, browserName }) => {
    await page.goto("./weddings/");
    const link = page.locator(".wbsk-card__link").first();
    await link.focus();
    await page.keyboard.press(tabKey(browserName, true));
    await page.keyboard.press(tabKey(browserName));
    await expect(link).toBeFocused();
    await expect(link).toHaveCSS("outline-width", "2px");
    await expect(link).toHaveCSS("outline-offset", "4px");
    await expect(link.locator(".wbsk-card__more")).toHaveCSS("opacity", "1", { timeout: 5000 });
  });

  test("cards below the screen arrive once; nothing stays hidden", async ({ page }) => {
    await page.goto("./weddings/");
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
    });
    const slots = page.locator(".wbsk-cardslot");
    await expect.poll(() => slots.evaluateAll((els) => els.every((el) => getComputedStyle(el).opacity === "1" && !(el as HTMLElement).dataset.enter)), { timeout: 8000 }).toBe(true);
  });
});

test.describe("Weddings page (Decision 05)", () => {
  test("Show more adds cards and moves focus to the first new one", async ({ page }) => {
    await page.goto("./weddings/");
    await expect(page.locator(".wbsk-grid .wbsk-card")).toHaveCount(12);
    await page.getByRole("button", { name: "Show more" }).click();
    await expect(page.locator(".wbsk-grid .wbsk-card")).toHaveCount(15);
    await expect(page.locator(".wbsk-grid > li").nth(12).locator(".wbsk-card__link")).toBeFocused();
    await expect(page.getByRole("button", { name: "Show more" })).toHaveCount(0);
  });

  test("the shared line pins under the header, swaps on hover, and leaves past the grid", async ({ page }) => {
    test.skip(isPhone(page), "Phones show the description under each card.");
    await page.goto("./weddings/");
    const line = page.locator(".wbsk-sharedline");
    await expect(line).toBeVisible();
    const grid = page.locator(".wbsk-grid");
    await grid.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + 300));
    const header = await page.locator(".wbsk-header").evaluate((el) => el.getBoundingClientRect().bottom);
    await expect.poll(() => line.evaluate((el) => el.getBoundingClientRect().top)).toBeCloseTo(header, 0);
    const before = await grid.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    const card = page.locator(".wbsk-card__link").nth(4);
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    await expect(line.locator("[aria-live]")).toContainText("Sample wording");
    expect(await grid.evaluate((el) => el.getBoundingClientRect().top + window.scrollY)).toBeCloseTo(before, 1);
    // It can't outlive the grid: past the end of the wrapper it has gone with it.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const wrapBottom = () => page.locator(".wbsk-gridwrap").evaluate((el) => el.getBoundingClientRect().bottom);
    await expect.poll(async () => (await line.evaluate((el) => el.getBoundingClientRect().bottom)) - (await wrapBottom())).toBeLessThanOrEqual(1);
  });

  test("phones: description sits under each card, with no shared line", async ({ page }) => {
    test.skip(!isPhone(page), "Phone layout.");
    await page.goto("./weddings/");
    await expect(page.locator(".wbsk-sharedline")).toBeHidden();
    await expect(page.locator(".wbsk-card__description").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });

  test("the closing line slides up the enquiry panel", async ({ page }) => {
    await page.goto("./weddings/");
    await page.locator(".wbsk-closingline button").click();
    await expect(page).toHaveURL(/weddings\//);
    await expect(page.locator(".wbsk-panel").first()).toBeVisible();
  });
});

test.describe("the moving row (Decision 30)", () => {
  test("drifts right to left, with copies hidden from everyone but the eye", async ({ page }) => {
    await gotoRow(page);
    await driftReady(page);
    await page.waitForTimeout(4500);
    const a = await offset(page);
    await expect.poll(() => offset(page), { timeout: 12000 }).toBeLessThan(a - 5);
    const copies = page.locator(".wbsk-drift__track > li:not([data-real])");
    expect(await copies.count()).toBe(16);
    const allHidden = await copies.evaluateAll((els) => els.every((el) => el.getAttribute("aria-hidden") === "true" && (el as HTMLElement).inert && el.querySelector("a")?.tabIndex === -1));
    expect(allHidden).toBe(true);
    expect(await page.locator(".wbsk-drift__track > li[data-real]").count()).toBe(8);
    expect(await page.locator(".wbsk-drift [data-slug]").count()).toBe(8);
    const srcs = await page.locator(".wbsk-drift__track > li img").evaluateAll((els) => new Set(els.map((el) => (el as HTMLImageElement).getAttribute("srcset"))).size);
    expect(srcs).toBe(8);
  });

  test("on large monitors too, the row loops and the wheel moves it", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium" || isPhone(page), "Screen size is what's being tested.");
    for (const size of [1920, 2560, 3440]) {
      await page.setViewportSize({ width: size, height: 1000 });
      const row = await gotoRow(page);
      await driftReady(page);
      await page.waitForTimeout(3600);
      const a = await offset(page);
      await expect.poll(() => offset(page), { timeout: 8000 }).toBeLessThan(a - 10);
      // No gaps: the track always reaches past both edges of the row.
      const covered = await row.evaluate((el) => {
        const t = el.querySelector(".wbsk-drift__track")!.getBoundingClientRect();
        const b = el.getBoundingClientRect();
        return t.left <= b.left && t.right >= b.right;
      });
      expect(covered).toBe(true);
      const box = (await row.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, Math.min(box.y + 150, 700));
      await page.waitForTimeout(700);
      const b = await offset(page);
      await page.mouse.wheel(0, 100);
      await expect.poll(async () => Math.abs((await offset(page)) - b), { timeout: 3000 }).toBeGreaterThan(100);
      await page.mouse.move(2, 2);
    }
  });

  test("with the cursor resting on the row, the wheel moves the cards and the page stays", async ({ page }) => {
    test.skip(isPhone(page), "Mouse wheel.");
    const row = await gotoRow(page);
    await driftReady(page);
    await page.waitForTimeout(3500);
    const box = (await row.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, Math.min(box.y + 150, 600));
    await page.waitForTimeout(700);
    const y = await page.evaluate(() => window.scrollY);
    const a = await offset(page);
    await page.mouse.wheel(0, 100);
    await expect.poll(async () => Math.abs((await offset(page)) - a), { timeout: 3000 }).toBeGreaterThan(100);
    expect(await page.evaluate(() => window.scrollY)).toBe(y);
  });

  test("a page scroll that started elsewhere carries on over the row", async ({ page }) => {
    test.skip(isPhone(page), "Mouse wheel.");
    await page.goto("./");
    await page.mouse.move(700, 300);
    const y = await page.evaluate(() => window.scrollY);
    for (let i = 0; i < 30; i += 1) {
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(40);
    }
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 4000 }).toBeGreaterThan(y + 2000);
  });

  test("a sideways wheel moves the row and leaves the page where it is", async ({ page }) => {
    test.skip(isPhone(page), "Trackpad.");
    const row = await gotoRow(page);
    await driftReady(page);
    const box = (await row.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, Math.min(box.y + 200, 600));
    const y = await page.evaluate(() => window.scrollY);
    const a = await offset(page);
    await page.mouse.wheel(300, 0);
    await expect.poll(async () => Math.abs((await offset(page)) - a), { timeout: 3000 }).toBeGreaterThan(200);
    expect(await page.evaluate(() => window.scrollY)).toBe(y);
  });

  test("dragging follows the mouse and never opens a story", async ({ page }) => {
    test.skip(isPhone(page), "Mouse drag.");
    await gotoRow(page);
    await driftReady(page);
    const card = page.locator(".wbsk-drift li[data-real]").nth(1);
    const box = (await card.boundingBox())!;
    const x = Math.max(box.x, 0) + 60;
    const y = Math.min(box.y + 100, 500);
    await page.mouse.move(x, y);
    await page.mouse.down();
    const a = await offset(page);
    await page.mouse.move(x - 40, y, { steps: 4 });
    await page.mouse.move(x - 140, y, { steps: 6 });
    const held = await offset(page);
    expect(Math.abs(held - a)).toBeGreaterThan(100);
    await page.mouse.up();
    await page.waitForTimeout(300);
    await expect(page).not.toHaveURL(/client\//);
  });

  test("hovering stops the drift; leaving starts it again", async ({ page }) => {
    test.skip(isPhone(page), "Hover.");
    const row = await gotoRow(page);
    await driftReady(page);
    const box = (await row.boundingBox())!;
    await page.mouse.move(box.x + 300, Math.min(box.y + 200, 600));
    await settled(page);
    const a = await offset(page);
    await page.mouse.move(5, 5);
    await expect.poll(async () => Math.abs((await offset(page)) - a), { timeout: 6000 }).toBeGreaterThan(5);
  });

  test("the pause button stays paused for the visit", async ({ page }) => {
    await gotoRow(page);
    await driftReady(page);
    await page.getByRole("button", { name: "Pause moving weddings" }).click();
    await settled(page);
    await gotoRow(page);
    await driftReady(page);
    await expect(page.getByRole("button", { name: "Play moving weddings" })).toBeVisible();
    const b = await offset(page);
    await page.waitForTimeout(700);
    expect(Math.abs((await offset(page)) - b)).toBeLessThan(1);
    await page.getByRole("button", { name: "Play moving weddings" }).click();
    // Pressing the button can scroll the row away, and off screen it rightly stops.
    await page.evaluate(() => {
      const el = document.querySelector(".wbsk-drift")!;
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 60);
    });
    await page.mouse.move(2, 2);
    await expect.poll(async () => Math.abs((await offset(page)) - b), { timeout: 6000 }).toBeGreaterThan(5);
  });

  test("it stops completely off screen", async ({ page }) => {
    await gotoRow(page);
    await driftReady(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1500);
    const a = await offset(page);
    await page.waitForTimeout(600);
    expect(await offset(page)).toBe(a);
  });

  test("Tab meets each real card once, in order, and brings it into view", async ({ page, browserName }) => {
    await gotoRow(page);
    await driftReady(page);
    await page.locator(".wbsk-drift li[data-real] a").first().focus();
    await page.keyboard.press(tabKey(browserName, true));
    const seen: string[] = [];
    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press(tabKey(browserName));
      seen.push(await page.evaluate(() => document.activeElement?.getAttribute("href") ?? ""));
    }
    expect(new Set(seen).size).toBe(8);
    const focused = page.locator(".wbsk-drift li[data-real] a").last();
    await expect(focused).toBeFocused();
    await expect
      .poll(() => focused.evaluate((el) => { const b = el.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth; }), { timeout: 4000 })
      .toBe(true);
  });

  test("arrows move the row by one card", async ({ page }) => {
    await gotoRow(page);
    await driftReady(page);
    await page.getByRole("button", { name: "Pause moving weddings" }).click();
    await settled(page);
    const step = await page.locator(".wbsk-drift li[data-real]").evaluateAll((els) => els[1]!.getBoundingClientRect().left - els[0]!.getBoundingClientRect().left);
    const place = async () => page.locator(".wbsk-drift li[data-real]").first().evaluate((el) => el.getBoundingClientRect().left);
    const a = await place();
    await page.getByRole("button", { name: "Next wedding" }).click();
    // The glide is timed, so a slow machine simply takes longer to show it.
    await expect.poll(async () => Math.abs((await place()) - a), { timeout: 15000 }).toBeGreaterThan(step * 0.5);
    await settled(page);
    expect(Math.abs((await place()) - a)).toBeLessThan(step * 1.5);
  });

  test("the loop's wrap is invisible: one full loop later the row looks identical", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium" || isPhone(page), "One careful pixel comparison is enough.");
    const row = await gotoRow(page);
    await driftReady(page);
    await page.getByRole("button", { name: "Pause moving weddings" }).click();
    await page.mouse.move(2, 2);
    await page.waitForTimeout(1500);
    const next = page.getByRole("button", { name: "Next wedding" });
    await next.click();
    const onTable = () =>
      row.evaluate((el) => {
        const box = el.getBoundingClientRect();
        return [...el.querySelectorAll(".wbsk-drift__track > li")]
          .map((li) => ({ left: li.getBoundingClientRect().left, photo: li.querySelector(".wbsk-album__photo img")!.getAttribute("srcset") }))
          .filter((album) => album.left > box.left - 200 && album.left < box.right);
      });
    await page.mouse.move(2, 2);
    await page.waitForTimeout(2300);
    const first = await onTable();
    for (let i = 0; i < 8; i += 1) {
      await next.click();
      await page.waitForTimeout(1250);
    }
    await page.mouse.move(2, 2);
    await page.waitForTimeout(2000);
    const again = await onTable();
    expect(again.map((album) => album.photo)).toEqual(first.map((album) => album.photo));
    again.forEach((album, i) => expect(Math.abs(album.left - first[i]!.left)).toBeLessThan(1.5));
  });

  test("pressing a copy on screen opens that couple's page", async ({ page }) => {
    await gotoRow(page);
    await driftReady(page);
    await page.getByRole("button", { name: "Pause moving weddings" }).click();
    await page.getByRole("button", { name: "Previous wedding" }).click();
    await page.waitForTimeout(1300);
    await settled(page);
    // Pressing the buttons scrolled them into view; bring the cards back.
    await page.evaluate(() => {
      const el = document.querySelector(".wbsk-drift")!;
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 100);
    });
    await page.waitForTimeout(700);
    const copy = page.locator(".wbsk-drift__track > li:not([data-real])").evaluateAll((els) => {
      const inView = els.find((el) => { const b = el.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth; }) ?? els.find((el) => { const b = el.getBoundingClientRect(); return b.right > 40 && b.left < innerWidth - 40; });
      if (!inView) return null;
      const b = inView.getBoundingClientRect();
      return { x: Math.max(b.left, 0) + Math.min(b.width, innerWidth) / 4, y: Math.min(b.top + 150, innerHeight - 20), href: inView.querySelector("a")!.getAttribute("href") };
    });
    const point = await copy;
    expect(point).not.toBeNull();
    await page.mouse.click(point!.x, point!.y);
    await expect(page).toHaveURL(/client\/sample-/);
  });

  test("only two cards: a still row, no copies, no pause button", async ({ page }) => {
    await gotoRow(page, "?featured=2");
    await expect(page.locator(".wbsk-drift")).toHaveAttribute("data-mode", "still", { timeout: 15000 });
    await expect(page.locator(".wbsk-drift__track > li")).toHaveCount(2);
    await expect(page.getByRole("button", { name: "Pause moving weddings" })).toHaveCount(0);
  });

  test("reduced motion: a still row with arrows and no pause button", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await gotoRow(page);
    await expect(page.locator(".wbsk-drift")).toHaveAttribute("data-mode", "still", { timeout: 15000 });
    await expect(page.locator(".wbsk-drift__track > li")).toHaveCount(8);
    await expect(page.getByRole("button", { name: "Pause moving weddings" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Next wedding" })).toBeEnabled();
    await page.getByRole("button", { name: "Next wedding" }).click();
    await expect.poll(() => page.locator(".wbsk-drift").evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
  });

  test("See all weddings sits below the row, on the right", async ({ page }) => {
    const row = await gotoRow(page);
    const link = page.getByRole("link", { name: "See all weddings →" });
    const rowBox = (await row.boundingBox())!;
    const linkBox = (await link.boundingBox())!;
    expect(linkBox.y).toBeGreaterThan(rowBox.y + 300);
    expect(linkBox.x + linkBox.width).toBeGreaterThan(width(page) * 0.7);
  });

  test("no accessibility problems with the row moving or paused", async ({ page }) => {
    await gotoRow(page);
    await driftReady(page);
    await page.getByRole("button", { name: "Pause moving weddings" }).click();
    await settled(page);
    // Colour is only meaningful once the cards have finished fading in.
    await expect.poll(() => page.locator(".wbsk-drift li[data-real]").evaluateAll((els) => els.every((el) => getComputedStyle(el).opacity === "1")), { timeout: 8000 }).toBe(true);
    const results = await new AxeBuilder({ page }).include(".wbsk-drift").analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.html}`)).toEqual([]);
  });

  test("without scripts it is a plain sideways row of real links", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4173/wbsk_website_2.0/");
    await expect(page.locator(".wbsk-drift .wbsk-album__link").first()).toHaveAttribute("href", /client\//);
    await expect(page.locator(".wbsk-drift")).toHaveCSS("overflow-x", "auto");
    await expect(page.locator(".wbsk-drift img").first()).toHaveCSS("opacity", "1");
    await context.close();
  });
});

test.describe("the albums (owner, 3 November 2026)", () => {
  /** The album nearest the middle of the row. */
  const middleAlbum = (page: Page) =>
    page.locator(".wbsk-drift__track > li").evaluateAll((els) => {
      const row = document.querySelector(".wbsk-drift")!.getBoundingClientRect();
      const middle = row.left + row.width / 2;
      const found = els
        .map((el) => el.getBoundingClientRect())
        .filter((b) => b.right > row.left && b.left < row.right)
        .sort((a, b) => Math.abs(a.left + a.width / 2 - middle) - Math.abs(b.left + b.width / 2 - middle))[0]!;
      return { x: found.left + found.width / 2, y: found.top + found.height / 2 };
    });
  const introOver = (page: Page) => page.waitForTimeout(4600);
  const openAlbums = (page: Page) => page.locator(".wbsk-drift__track > li[data-open]");

  test("hovering opens one album to two pages, and only then asks for their photographs", async ({ page }) => {
    test.skip(isPhone(page), "Hover.");
    await gotoRow(page);
    await driftReady(page);
    await introOver(page);
    expect(await page.locator(".wbsk-album__print img").count()).toBe(0);
    const point = await middleAlbum(page);
    await page.mouse.move(point.x, Math.min(point.y, 650));
    await expect(openAlbums(page)).toHaveCount(1, { timeout: 4000 });
    const open = openAlbums(page).first();
    await expect(open.locator(".wbsk-album__page--left .wbsk-album__who b")).toHaveText("Bride");
    await expect(open.locator(".wbsk-album__page--right .wbsk-album__who b")).toHaveText("Groom");
    await expect(open.locator(".wbsk-album__print img")).toHaveCount(2);
    await expect(page.getByRole("link", { name: "View story →" })).toBeVisible();
    const sides = await open.evaluate(async (el) => {
      await new Promise((r) => setTimeout(r, 1500));
      const left = el.querySelector(".wbsk-album__page--left")!.getBoundingClientRect();
      const right = el.querySelector(".wbsk-album__page--right")!.getBoundingClientRect();
      return { gap: right.left - left.right, leftWidth: left.width, rightWidth: right.width };
    });
    expect(Math.abs(sides.gap)).toBeLessThan(3);
    expect(Math.abs(sides.leftWidth - sides.rightWidth)).toBeLessThan(3);
    await page.mouse.move(2, 2);
    await expect(openAlbums(page)).toHaveCount(0, { timeout: 5000 });
  });

  test("a touch screen: first tap opens the album, second opens the couple's page", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, baseURL: "http://127.0.0.1:4173/wbsk_website_2.0/" });
    const page = await context.newPage();
    await page.addInitScript(() => sessionStorage.setItem("wbsk-intro-skip-for-tests", "1"));
    await gotoRow(page);
    await driftReady(page);
    await introOver(page);
    const point = await middleAlbum(page);
    await page.touchscreen.tap(point.x, point.y);
    await expect(openAlbums(page)).toHaveCount(1, { timeout: 4000 });
    await expect(page).not.toHaveURL(/client\//);
    await page.waitForTimeout(1600);
    const fits = await openAlbums(page).first().evaluate((el) => {
      const left = el.querySelector(".wbsk-album__page--left")!.getBoundingClientRect();
      const right = el.querySelector(".wbsk-album__page--right")!.getBoundingClientRect();
      return left.left >= 0 && right.right <= innerWidth;
    });
    expect(fits).toBe(true);
    await page.touchscreen.tap(195, point.y);
    await expect(page).toHaveURL(/client\/sample-/);
    await context.close();
  });

  test("tapping off an open album closes it and clears its description", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, baseURL: "http://127.0.0.1:4173/wbsk_website_2.0/" });
    const page = await context.newPage();
    await page.addInitScript(() => sessionStorage.setItem("wbsk-intro-skip-for-tests", "1"));
    await gotoRow(page);
    await driftReady(page);
    await introOver(page);
    const point = await middleAlbum(page);
    await page.touchscreen.tap(point.x, point.y);
    await expect(openAlbums(page)).toHaveCount(1, { timeout: 4000 });
    await page.touchscreen.tap(195, 70);
    await expect(openAlbums(page)).toHaveCount(0, { timeout: 5000 });
    await expect(page.locator(".wbsk-crossline span[data-on='true']")).toHaveText("");
    await context.close();
  });

  test("the keyboard opens an album on focus, and Escape shuts it", async ({ page, browserName }) => {
    await gotoRow(page);
    await driftReady(page);
    await introOver(page);
    await page.locator(".wbsk-drift li[data-real] a").first().focus();
    await page.keyboard.press(tabKey(browserName));
    // The one before may still be closing, but it does finish, even if it had barely begun.
    await expect(openAlbums(page)).toHaveCount(1, { timeout: 8000 });
    await page.keyboard.press("Escape");
    await expect(openAlbums(page)).toHaveCount(0, { timeout: 5000 });
  });

  test("round the whole loop, every album on the table is there", async ({ page }) => {
    await gotoRow(page);
    await driftReady(page);
    await introOver(page);
    await page.getByRole("button", { name: "Pause moving weddings" }).click();
    await page.evaluate(() => {
      const el = document.querySelector(".wbsk-drift")!;
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 100);
    });
    const next = page.getByRole("button", { name: "Next wedding" });
    for (let i = 0; i < 9; i += 1) {
      await next.click({ noWaitAfter: true });
      await page.waitForTimeout(1250);
      const missing = await page.locator(".wbsk-drift__track > li").evaluateAll((els) => {
        const row = document.querySelector(".wbsk-drift")!.getBoundingClientRect();
        const onTable = els.filter((el) => { const b = el.getBoundingClientRect(); return b.right > row.left + 2 && b.left < row.right - 2; });
        return onTable.filter((el) => { const style = getComputedStyle(el.querySelector(".wbsk-album__swell")!); return getComputedStyle(el).opacity !== "1" || style.visibility !== "visible"; }).length + (onTable.length ? 0 : 1);
      });
      expect(missing).toBe(0);
    }
  });

  test("the ribbon swings when the row moves and writes nothing once it is still", async ({ page }) => {
    await gotoRow(page);
    await driftReady(page);
    await introOver(page);
    await page.getByRole("button", { name: "Pause moving weddings" }).click();
    await page.mouse.move(2, 2);
    // On a busy machine the swing plays out in slow motion, so this waits for it to come to rest.
    const writes = () =>
      page.evaluate(async () => {
        let count = 0;
        const seen = new MutationObserver((list) => (count += list.length));
        document.querySelectorAll(".wbsk-album__link-piece").forEach((el) => seen.observe(el, { attributes: true, attributeFilter: ["style"] }));
        await new Promise((r) => setTimeout(r, 1000));
        seen.disconnect();
        return count;
      });
    await expect.poll(writes, { timeout: 30000, intervals: [1000] }).toBe(0);
    const swing = () => page.locator(".wbsk-album__link-piece").evaluateAll((els) => Math.max(...els.map((el) => Math.abs(new DOMMatrixReadOnly(getComputedStyle(el).transform).b))));
    await page.getByRole("button", { name: "Next wedding" }).click();
    await expect.poll(swing, { timeout: 3000 }).toBeGreaterThan(0.03);
  });

  test("reduced motion: no ribbon movement or turning, and an album opens at once", async ({ page, browserName }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await gotoRow(page);
    await expect(page.locator(".wbsk-drift")).toHaveAttribute("data-mode", "still", { timeout: 15000 });
    // Focus arrives from the album before, so the keyboard is what brought it.
    await page.locator(".wbsk-drift li[data-real] a").first().focus();
    await page.keyboard.press(tabKey(browserName));
    await expect(openAlbums(page)).toHaveCount(1, { timeout: 2000 });
    const flat = await openAlbums(page).first().locator(".wbsk-album__3d").evaluate((el) => (el as HTMLElement).style.transform);
    expect(flat).toBe("none");
    const moved = await page.locator(".wbsk-album__link-piece").evaluateAll((els) => els.filter((el) => (el as HTMLElement).style.transform).length);
    expect(moved).toBe(0);
  });

  test("a cover reads Sample wedding on samples, and names fit the paper however long", async ({ page }) => {
    await gotoRow(page);
    await driftReady(page);
    await expect(page.locator(".wbsk-album__label").first()).toContainText("wedding");
    const tooWide = await page.locator(".wbsk-drift li[data-real] .wbsk-album__names").evaluateAll((els) => els.filter((names) => {
      const photo = names.closest(".wbsk-album__front")!.querySelector(".wbsk-album__photo")!;
      const right = Math.max(...[...names.children].map((name) => {
        const range = document.createRange();
        range.selectNodeContents(name);
        return (name as HTMLElement).offsetLeft + range.getBoundingClientRect().width / (names.getBoundingClientRect().width / (names as HTMLElement).offsetWidth || 1);
      }));
      return (names as HTMLElement).parentElement!.offsetLeft + right > (photo as HTMLElement).offsetLeft;
    }).length);
    expect(tooWide).toBe(0);
  });
});

test.describe("card to couple's page (Decision 05)", () => {
  test("names the moving parts only for the move, then clears them", async ({ page, browserName }) => {
    test.skip(browserName === "firefox", "Same result; timing differs.");
    await page.goto("./weddings/");
    const named = () => page.locator(".wbsk-card__clip").evaluateAll((els) => els.filter((el) => getComputedStyle(el).viewTransitionName !== "none").length);
    expect(await named()).toBe(0);
    await page.locator(".wbsk-card__link").first().click();
    await expect(page).toHaveURL(/client\/sample-/);
    await page.goBack();
    await expect(page).toHaveURL(/weddings\/$/);
    await expect.poll(named, { timeout: 5000 }).toBe(0);
  });

  test("back to the homepage returns the row to the card that was pressed", async ({ page }) => {
    await gotoRow(page);
    await driftReady(page);
    await page.getByRole("button", { name: "Pause moving weddings" }).click();
    await settled(page);
    const card = page.locator(".wbsk-drift li[data-real]").nth(1).locator("a");
    const left = await card.evaluate((el) => el.getBoundingClientRect().left);
    await card.click();
    await expect(page).toHaveURL(/client\/sample-/);
    await page.goBack();
    await driftReady(page);
    // The cursor is still where the card was, and a card swells under it (Decision 30). Firefox
    // applies that straight after Back, so the row is measured with the cursor away.
    await page.mouse.move(0, 0);
    const again = page.locator(".wbsk-drift li[data-real]").nth(1).locator("a");
    await expect.poll(() => again.evaluate((el) => el.getBoundingClientRect().left), { timeout: 5000 }).toBeCloseTo(left, -1);
  });
});
