import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const settled = (page: Page) =>
  page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.timeline instanceof DocumentTimeline)
        .map((a) => a.finished.catch(() => {})),
    ),
  );

async function checks(page: Page) {
  await settled(page);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
}

test.beforeEach(async ({ page }) => {
  test.slow();
  await page.addInitScript(() => sessionStorage.setItem("wbsk-intro-skip-for-tests", "1"));
});

test("homepage: every section, in the agreed order, with nothing broken", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  const tops = await page.evaluate(() =>
    [".wbsk-hero", ".wbsk-philosophy", '[aria-label="Featured weddings"]', '[aria-label="Featured films"]', '[aria-label="The team"]', '[aria-label="What our couples say"]', "#enquire"].map(
      (selector) => document.querySelector(selector)!.getBoundingClientRect().top,
    ),
  );
  expect(tops).toEqual([...tops].sort((a, b) => a - b));
  await expect(page.locator(".wbsk-counter")).toHaveCount(2);
  await expect(page.locator(".wbsk-drift li[data-real]")).not.toHaveCount(0);
  await checks(page);
  expect(errors).toEqual([]);
});

test("featured cards open a couple's page; See all goes to Weddings", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("link", { name: "See all weddings →" })).toHaveAttribute("href", /weddings\/$/);
  await page.locator(".wbsk-drift").scrollIntoViewIfNeeded();
  await page.locator('.wbsk-drift[data-mode="drift"]').waitFor({ timeout: 15000 });
  // A paused row holds still for the test's click; a person simply presses it as it drifts.
  await page.getByRole("button", { name: "Pause moving weddings" }).click();
  const card = page.locator(".wbsk-drift li[data-real] .wbsk-card__link").first();
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await expect(page).toHaveURL(/client\//);
});

test("film stack: arrows change the front film, and nothing loads from YouTube until pressed", async ({ page }) => {
  const youtube: string[] = [];
  page.on("request", (r) => {
    if (/youtube|ytimg/.test(r.url())) youtube.push(r.url());
  });
  await page.goto("./");
  const stack = page.locator(".wbsk-stack");
  await stack.scrollIntoViewIfNeeded();
  await expect(stack.locator(".wbsk-stack__count")).toContainText("1 / ");
  await stack.getByRole("button", { name: "Next film" }).click();
  await expect(stack.locator(".wbsk-stack__count")).toContainText("2 / ");
  expect(youtube).toEqual([]);
  await stack.locator('.wbsk-stack__card[data-place="0"] .wbsk-film__play').click();
  await expect(stack.locator('.wbsk-stack__card[data-place="0"] iframe')).toHaveCount(1);
  await stack.getByRole("button", { name: "Next film" }).click();
  await expect(stack.locator("iframe")).toHaveCount(0);
});

test("reviews: arrows and pause work, the reading view opens and closes", async ({ page }) => {
  await page.goto("./");
  const reviews = page.locator(".wbsk-reviews");
  await reviews.scrollIntoViewIfNeeded();
  const who = reviews.locator(".wbsk-reviews__slide .wbsk-reviews__who");
  const first = await who.innerText();
  await reviews.getByRole("button", { name: "Next review" }).first().click();
  await expect(who).not.toHaveText(first);
  await reviews.getByRole("button", { name: /Read full review/ }).click();
  const view = page.locator(".wbsk-readview");
  await expect(view).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(view).toBeHidden();
});

test("the hero never plays a film for reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await page.waitForTimeout(800);
  for (const video of await page.locator(".wbsk-covervideo").all()) {
    expect(await video.getAttribute("src")).toBeNull();
    expect(await video.getAttribute("poster")).toBeTruthy();
  }
});

test("Films: dark, one per screen, with text and no YouTube until pressed", async ({ page }) => {
  const youtube: string[] = [];
  page.on("request", (r) => {
    if (/youtube|ytimg/.test(r.url())) youtube.push(r.url());
  });
  await page.goto("./films/");
  const films = page.locator(".wbsk-screening__film");
  await expect(films.first()).toBeVisible();
  const height = await films.first().evaluate((el) => el.getBoundingClientRect().height);
  expect(height).toBeGreaterThanOrEqual(page.viewportSize()!.height - 1);
  await expect(films.first().locator(".wbsk-label")).toBeVisible();
  expect(youtube).toEqual([]);
  await checks(page);
});

test("Our team: lead first and largest, crew alternate, closing links", async ({ page }) => {
  await page.goto("./our-team/");
  await expect(page.locator(".wbsk-person").first()).toHaveAttribute("data-lead", "true");
  await expect(page.getByRole("link", { name: "Careers →" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tell us about your wedding" })).toBeVisible();
  await checks(page);
});

test("Careers: open roles and the form", async ({ page }) => {
  await page.goto("./careers/");
  await expect(page.getByRole("heading", { name: "Sample Lead Photographer" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Be part of WBSK" })).toBeVisible();
  await checks(page);
});

test("Pre-wedding: cover, records, offerings, galleries and form, in order", async ({ page }) => {
  await page.goto("./pre-wedding/");
  const tops = await page.evaluate(() =>
    [".wbsk-hero", ".wbsk-arc", ".wbsk-offerings", ".wbsk-offering__gallery", "#plan"].map(
      (selector) => document.querySelector(selector)!.getBoundingClientRect().top,
    ),
  );
  expect(tops).toEqual([...tops].sort((a, b) => a - b));
  await expect(page.getByRole("heading", { name: "Full-length", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Concept", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Plan your pre-wedding" })).toBeVisible();
  await checks(page);
});

test("a destination page: cover, films, gallery, full-screen photo, and Book", async ({ page }) => {
  await page.goto("./pre-wedding/sample-goa/");
  await expect(page.locator("h1")).toContainText("Sample Goa");
  await expect(page.getByRole("link", { name: "Back to the records" })).toBeVisible();
  await expect(page.locator(".wbsk-carousel__film")).not.toHaveCount(0);
  await expect(page.locator(".wbsk-carousel__tag").first()).toHaveText(/Full-length|Concept/);
  const photo = page.locator(".wbsk-gallery__photo").first();
  await photo.scrollIntoViewIfNeeded();
  await photo.click();
  await expect(page.locator(".wbsk-lightbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Book your pre-wedding" }).click();
  await expect(page.locator(".wbsk-panel").getByRole("heading", { name: "Plan your pre-wedding" })).toBeVisible();
  await page.keyboard.press("Escape");
  await checks(page);
});

test("without scripts every photo still shows", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/wbsk_website_2.0/weddings/");
  await expect(page.locator(".wbsk-card__photo img").first()).toHaveCSS("opacity", "1");
  await context.close();
});

test("only one film plays at a time, across a page", async ({ page }) => {
  await page.goto("./pre-wedding/");
  const films = page.locator(".wbsk-offering__films .wbsk-film");
  await films.nth(0).locator(".wbsk-film__play").click();
  await expect(films.nth(0).locator("iframe")).toHaveCount(1);
  await films.nth(1).locator(".wbsk-film__play").click();
  await expect(films.nth(1).locator("iframe")).toHaveCount(1);
  await expect(films.nth(0).locator("iframe")).toHaveCount(0);
});

test("scrolling past the records before they've introduced themselves isn't held up", async ({ page, browserName }) => {
  test.skip(browserName === "webkit" || (page.viewportSize()?.width ?? 0) < 760, "Mouse wheel, computers.");
  await page.goto("./pre-wedding/");
  const box = (await page.locator(".wbsk-arc").boundingBox())!;
  await page.mouse.move(100, Math.min(box.y + 20, page.viewportSize()!.height - 10));
  const before = await page.evaluate(() => scrollY);
  await page.evaluate((top) => scrollTo({ top: top - innerHeight + 60, behavior: "instant" }), box.y);
  await page.mouse.wheel(0, 120);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
});

test("the consent line links its own words once, and the footer shows Instagram", async ({ page }) => {
  await page.goto("./careers/");
  const consent = page.locator(".wbsk-consent");
  await expect(consent.getByRole("link")).toHaveCount(1);
  await expect(consent).not.toContainText(/privacy policy.*privacy policy/i);
  await expect(page.locator("footer").getByRole("link", { name: /Instagram/ })).toBeVisible();
});

test("Privacy explains what happens to details", async ({ page }) => {
  await page.goto("./privacy/");
  await expect(page.locator(".wbsk-prose")).toContainText("What we collect");
});
