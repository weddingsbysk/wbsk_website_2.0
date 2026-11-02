import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const LARGE = "./client/sample-asha-sample-kabir/";
const isPhone = (page: Page) => (page.viewportSize()?.width ?? 0) < 760;
const isWide = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;

test.beforeEach(async ({ page }) => {
  test.slow();
  await page.addInitScript(() => sessionStorage.setItem("wbsk-intro-skip-for-tests", "1"));
});

test("Weddings page: lead story, grid, no accessibility problems, no sideways scroll", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./weddings/");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator(".wbsk-lead-story")).toContainText("Sample");
  await expect(page.locator(".wbsk-card")).toHaveCount(12);
  // Newest first: the lead is the newest, and each card is older than the one before.
  await expect(page.locator(".wbsk-lead-story")).toContainText("Sample Asha");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  await page.locator(".wbsk-letterbox[data-letterbox='open']").waitFor({ timeout: 15000 });
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.timeline instanceof DocumentTimeline)
        .map((a) => a.finished.catch(() => {})),
    ),
  );
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
  expect(errors).toEqual([]);
});

test("the grid has the agreed columns", async ({ page }) => {
  await page.goto("./weddings/");
  const columns = await page.locator(".wbsk-grid").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  const width = page.viewportSize()!.width;
  expect(columns).toBe(width >= 1200 ? 3 : width >= 700 ? 2 : 1);
});

test("hovering a card shows its description without moving any row", async ({ page }) => {
  test.skip(isPhone(page), "Phones show it under each card.");
  await page.goto("./weddings/");
  const line = page.locator(".wbsk-sharedline");
  const card = page.locator(".wbsk-card__link").first();
  await card.scrollIntoViewIfNeeded();
  const gridTop = () => page.locator(".wbsk-grid").evaluate((el) => el.getBoundingClientRect().top + scrollY);
  const before = await gridTop();
  await card.hover();
  await expect(line).toContainText("Sample wording");
  expect(await gridTop()).toBeCloseTo(before, 1);
  await expect(page.locator(".wbsk-card__more").first()).toHaveCSS("opacity", "1", { timeout: 3000 });
});

test("a card opens its couple's page, and Back returns", async ({ page }) => {
  await page.goto("./weddings/");
  const card = page.locator(".wbsk-card__link").first();
  const name = (await card.getByRole("heading").innerText()).trim();
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await expect(page).toHaveURL(/client\/sample-/);
  await expect(page.locator("h1")).toHaveText(name);
  await page.goBack();
  await expect(page).toHaveURL(/weddings\/$/);
  await expect(page.locator(".wbsk-card").first()).toBeVisible();
});

test("couple's page has every section, in order, with no accessibility problems", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(LARGE);
  await expect(page.locator("h1")).toContainText("Sample Asha");
  await expect(page.locator(".wbsk-storycover__label")).toContainText("DESTINATION · GOA");
  await expect(page.locator(".wbsk-gallery li")).toHaveCount(60);
  await expect(page.locator(".wbsk-reel").first()).toHaveAttribute("target", "_blank");
  const tops = await page.evaluate(() =>
    [".wbsk-storycover", ".wbsk-story", ".wbsk-gallery", ".wbsk-cinema", ".wbsk-closingband", ".wbsk-nextstory"].map(
      (s) => document.querySelector(s)!.getBoundingClientRect().top,
    ),
  );
  expect(tops).toEqual([...tops].sort((a, b) => a - b));
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
  expect(errors).toEqual([]);
});

test("gallery: agreed columns, Studio order left to right, and no photos overlap", async ({ page }) => {
  // Motion off, so positions are the true layout rather than a frame of the scroll animation.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(LARGE);
  const data = await page.locator(".wbsk-gallery > li").evaluateAll((items) =>
    items.map((el) => {
      const b = el.querySelector("a")!.getBoundingClientRect();
      return { x: Math.round(b.left), top: b.top, bottom: b.bottom };
    }),
  );
  const columns = [...new Set(data.map((d) => d.x))];
  expect(columns.length).toBe(isWide(page) ? 5 : 2);
  // Reading order: the first photos sit in columns left to right.
  expect(data.slice(0, columns.length).map((d) => d.x)).toEqual([...columns].sort((a, b) => a - b));
  for (const x of columns) {
    const stack = data.filter((d) => d.x === x);
    stack.slice(1).forEach((d, i) => expect(d.top).toBeGreaterThanOrEqual(stack[i]!.bottom - 0.5));
  }
});

test("the gallery scrolls in its own window, the page holds still, and the page takes over at the end", async ({ page }) => {
  await page.goto(LARGE);
  const frame = page.locator(".wbsk-gallerywindow");
  await frame.scrollIntoViewIfNeeded();
  const pageBefore = await page.evaluate(() => scrollY);
  await frame.evaluate((el) => el.scrollTo(0, 800));
  await expect.poll(() => frame.evaluate((el) => el.scrollTop)).toBeGreaterThan(700);
  expect(await page.evaluate(() => scrollY)).toBe(pageBefore);
  expect(await frame.evaluate((el) => el.scrollHeight > el.clientHeight * 1.5)).toBe(true);
  expect(await frame.evaluate((el) => getComputedStyle(el).overscrollBehaviorY)).toBe("auto");
  await expect(frame).toHaveAttribute("tabindex", "0");
});

test("photos further down wait until they're near, and their space is already reserved", async ({ page }) => {
  await page.goto(LARGE);
  const last = page.locator(".wbsk-gallery__sharp").last();
  expect(await last.getAttribute("loading")).toBe("lazy");
  const height = await page.locator(".wbsk-gallery").evaluate((el) => el.scrollHeight);
  expect(height).toBeGreaterThan(500);
});

test("full-screen view: opens, moves, counts, closes, and returns focus", async ({ page }) => {
  await page.goto(LARGE);
  const first = page.locator(".wbsk-gallery__photo").first();
  await first.scrollIntoViewIfNeeded();
  await first.click();
  const view = page.locator(".wbsk-lightbox");
  await expect(view).toBeVisible();
  await expect(view.locator(".wbsk-lightbox__count")).toContainText("1 / 60");
  await expect(view.locator(".wbsk-lightbox__mark")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(view.locator(".wbsk-lightbox__count")).toContainText("2 / 60");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(view.locator(".wbsk-lightbox__count")).toContainText("60 / 60");
  const results = await new AxeBuilder({ page }).include(".wbsk-lightbox").analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(view).toBeHidden();
  await expect(first).toBeFocused();
});

test("films load nothing from YouTube until pressed", async ({ page }) => {
  const youtube: string[] = [];
  page.on("request", (r) => {
    if (/youtube|ytimg|googlevideo/.test(r.url())) youtube.push(r.url());
  });
  await page.goto(LARGE);
  await page.waitForTimeout(1000);
  expect(youtube).toEqual([]);
  await expect(page.locator(".wbsk-film iframe")).toHaveCount(0);
  await page.locator(".wbsk-film__play").first().click();
  const frame = page.locator(".wbsk-film iframe").first();
  await expect(frame).toHaveAttribute("src", /youtube-nocookie\.com\/embed\/Uu6J7jDswug/);
});

test("the closing band slides up the panel over the page, and Esc closes it", async ({ page }) => {
  await page.goto(LARGE);
  const url = page.url();
  await page.locator(".wbsk-closingband button").click();
  const panel = page.locator(".wbsk-panel");
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute("data-open", "true");
  expect(page.url()).toBe(url);
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
});

test("Next story goes to the next older wedding, and loops after the oldest", async ({ page }) => {
  await page.goto(LARGE);
  const next = page.locator(".wbsk-nextstory");
  await expect(next).toContainText("Sample Mira");
  await next.click();
  await expect(page).toHaveURL(/sample-mira/);
  await expect(page.locator("h1")).toContainText("Sample Mira");
  await page.goBack();
  await expect(page).toHaveURL(/sample-asha/);
  await page.goto("./client/sample-pari-sample-dhruv/");
  await expect(page.locator(".wbsk-nextstory")).toContainText("Sample Asha");
});

test("every gallery scrolls in its own window while the page holds still", async ({ page }) => {
  test.skip(isPhone(page), "Mouse wheel.");
  for (const address of [LARGE, "./pre-wedding/", "./pre-wedding/sample-goa/"]) {
    await page.goto(address);
    const windowed = page.locator(".wbsk-gallerywindow").first();
    await windowed.scrollIntoViewIfNeeded();
    await windowed.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 120));
    await page.waitForTimeout(700);
    const box = (await windowed.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 100);
    const before = await page.evaluate(() => window.scrollY);
    if ((await windowed.evaluate((el) => el.scrollHeight - el.clientHeight)) < 300) continue;
    for (let i = 0; i < 2; i += 1) {
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(120);
    }
    await expect.poll(() => windowed.evaluate((el) => el.scrollTop), { timeout: 3000 }).toBeGreaterThan(50);
    expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(before, -1);
  }
});

test("reduced motion: no bars, instant pages", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./weddings/");
  await expect(page.locator(".wbsk-letterbox__bar").first()).toBeHidden();
  await page.locator(".wbsk-card__link").first().click();
  await expect(page).toHaveURL(/client\/sample-/);
});

test("without scripts: photos show and every photo is a real link", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:4173/wbsk_website_2.0/${LARGE.slice(2)}`);
  await expect(page.locator(".wbsk-gallery__sharp").first()).toHaveCSS("opacity", "1");
  await expect(page.locator(".wbsk-gallery__photo").first()).toHaveAttribute("href", /cdn\.sanity\.io/);
  await page.goto("http://127.0.0.1:4173/wbsk_website_2.0/weddings/");
  await expect(page.locator(".wbsk-letterbox__bar").first()).toBeHidden();
  await context.close();
});
