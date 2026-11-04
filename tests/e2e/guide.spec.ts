import { expect, test } from "@playwright/test";

const COUPLE = "./client/sample-asha-sample-kabir/";
const firstVisit = { cookies: [], origins: [] };
const card = ".wbsk-guide__card";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("wbsk-intro-skip-for-tests", "1"));
});

test.describe("the first-visit guide", () => {
  test.use({ storageState: firstVisit });

  test("shows the way to the photographs and the film, then never again", async ({ page }) => {
    await page.goto(COUPLE);
    await expect(page.locator(card)).toContainText("Scroll down for their photographs", { timeout: 6000 });
    await expect(page.locator(card)).toContainText("Their film is just past the gallery", { timeout: 6000 });
    await expect(page.locator(card)).toHaveCount(0, { timeout: 6000 });
    await page.reload();
    await page.waitForTimeout(2500);
    await expect(page.locator(card)).toHaveCount(0);
  });

  test("goes at the first scroll, and never takes a click", async ({ page }) => {
    await page.goto(COUPLE);
    await expect(page.locator(card)).toBeVisible({ timeout: 6000 });
    const box = (await page.locator(card).boundingBox())!;
    const under = await page.evaluate(([x, y]) => document.elementFromPoint(x!, y!)?.closest(".wbsk-guide") !== null, [box.x + box.width / 2, box.y + box.height / 2]);
    expect(under).toBe(false);
    await page.mouse.move(200, 300);
    await page.mouse.wheel(0, 200);
    await expect(page.locator(card)).toHaveCount(0, { timeout: 1200 });
  });

  test("causes no layout shift and stays out of screen readers' way", async ({ page }) => {
    await page.goto(COUPLE);
    const top = () => page.locator(".wbsk-storycover").evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    await page.waitForTimeout(800);
    const before = await top();
    await expect(page.locator(card)).toBeVisible({ timeout: 6000 });
    expect(await top()).toBe(before);
    // It lives outside the page's sections, where it can't change how they're laid out.
    expect(await page.locator(".wbsk-guide").evaluate((el) => el.parentElement?.tagName)).toBe("BODY");
    await expect(page.locator(".wbsk-guide")).toHaveAttribute("aria-hidden", "true");
    expect(await page.evaluate(() => document.activeElement?.closest(".wbsk-guide") ?? null)).toBeNull();
  });

  test("with reduced motion the arrow stays still", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(COUPLE);
    await expect(page.locator(card)).toBeVisible({ timeout: 6000 });
    await page.waitForTimeout(500);
    const place = () => page.locator(".wbsk-guide__arrow").evaluate((el) => getComputedStyle(el).transform);
    const a = await place();
    await page.waitForTimeout(400);
    expect(await place()).toBe(a);
  });

  test("the gallery gets its own hint once, when it comes to rest in view", async ({ page }) => {
    await page.goto(COUPLE);
    await page.locator(".wbsk-gallerywindow").evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 120, behavior: "instant" }));
    await expect(page.locator(card)).toContainText("inside the frame", { timeout: 4000 });
    await page.mouse.move(200, 400);
    await page.mouse.wheel(0, 60);
    await expect(page.locator(card)).toHaveCount(0, { timeout: 1200 });
    await page.reload();
    await page.locator(".wbsk-gallerywindow").evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 120, behavior: "instant" }));
    await page.waitForTimeout(1500);
    await expect(page.locator(card)).toHaveCount(0);
  });

  test("on a touch screen it says swipe, and the arrow points up", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await page.addInitScript(() => sessionStorage.setItem("wbsk-intro-skip-for-tests", "1"));
    await page.goto(COUPLE);
    await expect(page.locator(card)).toContainText("Swipe up for their photographs", { timeout: 6000 });
    await expect(page.locator(".wbsk-guide__arrowbox")).toHaveAttribute("data-direction", "up");
    await context.close();
  });
});

test.describe("the guide on other pages", () => {
  test.use({ storageState: firstVisit });

  const goTo = (page: import("@playwright/test").Page, selector: string) =>
    page.locator(selector).first().evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 120, behavior: "instant" }));

  test("Home: the albums, then Featured Films, each once and never together", async ({ page }) => {
    await page.goto("./");
    await goTo(page, ".wbsk-drifttray");
    await expect(page.locator(card)).toContainText("album", { timeout: 6000 });
    expect(await page.locator(".wbsk-guide").count()).toBe(1);
    await page.mouse.move(200, 100);
    await page.mouse.wheel(0, 80);
    await expect(page.locator(card)).toHaveCount(0, { timeout: 1500 });
    // The wheel's smooth glide finishes first, or it would carry the page back.
    await page.waitForTimeout(900);
    await goTo(page, ".wbsk-stack");
    await expect(page.locator(card)).toContainText("films", { timeout: 6000 });
    expect(await page.locator(".wbsk-guide").count()).toBe(1);
    await page.reload();
    await goTo(page, ".wbsk-drifttray");
    await page.waitForTimeout(2500);
    await expect(page.locator(card)).toHaveCount(0);
  });

  test("Pre-wedding: the records get a hint once they've introduced themselves", async ({ page }) => {
    await page.goto("./pre-wedding/");
    await goTo(page, ".wbsk-arc");
    await expect(page.locator(card)).toContainText("records", { timeout: 9000 });
  });

  test("Films: the window gets its hint, and the words suit the screen", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const phone = await context.newPage();
    await phone.addInitScript(() => sessionStorage.setItem("wbsk-intro-skip-for-tests", "1"));
    await phone.goto("./films/");
    await goTo(phone, ".wbsk-filmtray__window");
    await expect(phone.locator(card)).toContainText("Swipe sideways for more films", { timeout: 6000 });
    await expect(phone.locator(".wbsk-guide__arrowbox")).toHaveAttribute("data-direction", "left");
    await context.close();
  });

  test("a gallery explained once isn't explained again on another page", async ({ page }) => {
    await page.goto(COUPLE);
    await goTo(page, ".wbsk-gallerywindow");
    await expect(page.locator(card)).toContainText("inside the frame", { timeout: 6000 });
    await page.goto("./pre-wedding/sample-goa/");
    await goTo(page, ".wbsk-gallerywindow");
    await page.waitForTimeout(2600);
    await expect(page.locator(card).filter({ hasText: "inside the frame" })).toHaveCount(0);
  });

  test("pages that simply scroll down have no guide", async ({ page }) => {
    await page.goto("./our-team/");
    await page.waitForTimeout(2500);
    await expect(page.locator(card)).toHaveCount(0);
  });
});

test.describe("position bars", () => {
  test("the phone's Films row has a bar that follows the row; computers have the side mark", async ({ page }) => {
    await page.goto("./films/");
    const width = page.viewportSize()?.width ?? 0;
    const bar = page.locator(".wbsk-filmtray .wbsk-posbar");
    if (width >= 700) {
      await expect(bar).toBeHidden();
      await expect(page.locator(".wbsk-filmtray .wbsk-gallerywindow__progress")).toBeVisible();
      return;
    }
    await expect(bar).toBeVisible();
    const thumb = bar.locator(".wbsk-posbar__thumb");
    const left = () => thumb.evaluate((el) => el.getBoundingClientRect().left);
    const before = await left();
    await page.locator(".wbsk-filmtray__window").evaluate((el) => (el.scrollLeft = 600));
    await expect.poll(left).toBeGreaterThan(before);
    expect(await bar.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  });

  test("the album row's mark travels as the row loops, and takes no clicks", async ({ page }) => {
    await page.goto("./");
    await page.locator(".wbsk-drifttray").evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 200, behavior: "instant" }));
    await expect(page.locator('.wbsk-drift[data-mode="drift"]')).toBeVisible({ timeout: 30000 });
    const slider = page.locator(".wbsk-drifttray + .wbsk-posbar .wbsk-posbar__slider");
    const at = () => slider.evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41);
    await page.waitForTimeout(6000);
    const a = await at();
    await page.waitForTimeout(1200);
    expect(await at()).not.toBe(a);
    expect(await page.locator(".wbsk-drifttray + .wbsk-posbar").getAttribute("aria-hidden")).toBe("true");
  });

  test("Featured Films has a mark too", async ({ page }) => {
    await page.goto("./");
    await expect(page.locator(".wbsk-stack .wbsk-posbar")).toBeAttached({ timeout: 15000 });
  });

  test("a gallery's side mark is hidden only when there's nothing to scroll", async ({ page }) => {
    await page.goto(COUPLE);
    await expect(page.locator(".wbsk-gallerywindow__progress").first()).toBeVisible();
  });
});
