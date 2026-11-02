import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const width = (page: Page) => page.viewportSize()?.width ?? 0;
const isPhone = (page: Page) => width(page) < 760;
const skipIntro = (page: Page) =>
  page.addInitScript(() => sessionStorage.setItem("wbsk-intro-skip-for-tests", "1"));

const arc = (page: Page) => page.locator(".wbsk-arc");
const ready = (page: Page) =>
  expect(arc(page)).toHaveAttribute("data-state", "ready", { timeout: 30000 });
/** Waits for the arc to stop, however slowly this machine draws it. */
const atRest = (page: Page) => expect(page.locator(".wbsk-arc:not([data-moving])")).toHaveCount(1, { timeout: 30000 });
/** Software-drawn browsers on the build server can take many seconds per move. */
const MOVE_TIMEOUT = 30000;

test.describe("opening intro", () => {
  test("the hero title waits for the logo to land, then arrives", async ({ page }) => {
    await page.goto("./");
    const word = page.locator(".wbsk-title__word > span").first();
    await expect(page.locator("html")).toHaveAttribute("data-intro", "play");
    await expect(word).toHaveCSS("opacity", "0");
    await expect(page.locator("h1")).toHaveText(/\S/);
    await expect(page.locator("html")).not.toHaveAttribute("data-intro", "play", { timeout: 9000 });
    await expect(word).toHaveCSS("opacity", "1", { timeout: 4000 });
    await expect(word).toHaveCSS("filter", "none", { timeout: 6000 });
  });

  test("plays each time the homepage opens, lands the logo on the header, and a refresh starts at the top", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("./");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-intro", "play");
    await expect(page.locator(".wbsk-intro__veil")).toBeVisible();
    await expect(html).not.toHaveAttribute("data-intro", "play", { timeout: 9000 });
    await expect(page.locator(".wbsk-intro__veil")).toBeHidden();
    await expect(page.locator(".wbsk-header__logo img")).toHaveCSS("opacity", "1");
    expect(errors).toEqual([]);

    await page.evaluate(() => window.scrollTo(0, 800));
    await page.reload();
    await expect(html).toHaveAttribute("data-intro", "play");
    await expect(page.locator(".wbsk-intro__veil")).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });

  test("if a phone blocks the clip, the still logo still glides home and the page comes up", async ({ page }) => {
    await page.addInitScript(() => {
      HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException("blocked", "NotAllowedError"));
    });
    await page.goto("./");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-intro", "play");
    await expect(page.locator(".wbsk-intro__glide")).toHaveCSS("opacity", "1", { timeout: 4000 });
    await expect(html).not.toHaveAttribute("data-intro", "play", { timeout: 9000 });
    await expect(page.locator(".wbsk-header__logo img")).toHaveCSS("opacity", "1");
  });

  test("the clip loads and plays through, with the lighter file on phones", async ({ page }) => {
    await page.goto("./");
    const phone = (page.viewportSize()?.width ?? 0) < 820;
    await expect
      .poll(() => page.locator(".wbsk-intro video").evaluate((el) => (el as HTMLVideoElement).currentSrc), { timeout: 5000 })
      .toContain(phone ? "intro-reverse-phone.mp4" : "intro-reverse.mp4");
    await expect
      .poll(() => page.evaluate(() => { const v = document.querySelector<HTMLVideoElement>(".wbsk-intro video"); return v ? v.currentTime : -1; }), { timeout: 9000 })
      .toBeGreaterThan(0.3);
    expect(await page.locator(".wbsk-intro video").evaluate((el) => (el as HTMLVideoElement).error)).toBeNull();
  });

  test("moving within the site and browser Back don't replay it", async ({ page }) => {
    await page.goto("./");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-intro", "play");
    await page.keyboard.press("Escape");
    await expect(html).not.toHaveAttribute("data-intro", "play");
    await page.locator(".wbsk-header__logo").waitFor();
    await page.evaluate(() => window.scrollTo(0, 900));
    await page.goto("./weddings/");
    await expect(html).not.toHaveAttribute("data-intro", "play");
    await page.goBack();
    await expect(page).toHaveURL(/wbsk_website_2\.0\/$/);
    await expect(html).not.toHaveAttribute("data-intro", "play");
    await expect(page.locator(".wbsk-intro__veil")).toBeHidden();
  });

  test("the glide finishes exactly on the header logo", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Same maths in every browser; one is enough here.");
    await page.goto("./");
    const logo = await page.locator(".wbsk-header__logo img").boundingBox();
    // Read the glide's end point directly from its finished animation.
    await page.waitForFunction(() =>
      document.querySelector(".wbsk-intro__glide")?.getAnimations().some((a) => {
        const k = (a.effect as KeyframeEffect).getKeyframes();
        return k.length === 2 && String(k[1]?.transform).includes("translate");
      }),
      undefined,
      { timeout: 9000 },
    );
    const end = await page.evaluate(() => {
      const glide = document.querySelector<HTMLElement>(".wbsk-intro__glide")!;
      const moving = glide
        .getAnimations()
        .find((a) => String((a.effect as KeyframeEffect).getKeyframes()[1]?.transform).includes("translate"))!;
      moving.pause();
      moving.currentTime = (moving.effect as KeyframeEffect).getComputedTiming().endTime as number;
      const box = glide.getBoundingClientRect();
      return { x: box.left, y: box.top, width: box.width };
    });
    expect(Math.abs(end.x - logo!.x)).toBeLessThan(1);
    expect(Math.abs(end.y - logo!.y)).toBeLessThan(1);
    expect(Math.abs(end.width - logo!.width)).toBeLessThan(1);
  });

  test("a tap, click or key press skips straight to the homepage", async ({ page }) => {
    await page.goto("./");
    await expect(page.locator(".wbsk-intro__veil")).toBeVisible();
    await page.keyboard.press("Space");
    await expect(page.locator(".wbsk-intro__veil")).toBeHidden({ timeout: 2000 });
    await expect(page.locator("h1")).toBeVisible();
  });

  test("never covers the enquiry link or another page", async ({ page }) => {
    await page.goto("./#enquire");
    await expect(page.locator("html")).not.toHaveAttribute("data-intro", "play");
    await page.goto("./films/");
    await expect(page.locator("html")).not.toHaveAttribute("data-intro", "play");
  });

  test("the page text is there from the start and the intro is hidden from screen readers", async ({
    page,
  }) => {
    await page.goto("./");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator(".wbsk-intro")).toHaveAttribute("aria-hidden", "true");
  });

  test("reduced motion gets a brief still and no glide", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./");
    await expect(page.locator(".wbsk-intro video")).toHaveCSS("opacity", "0");
    await expect(page.locator(".wbsk-intro__veil")).toBeHidden({ timeout: 3000 });
  });

  test("without scripts there is no veil", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4173/wbsk_website_2.0/");
    await expect(page.locator(".wbsk-intro__veil")).toBeHidden();
    await expect(page.locator("h1")).toBeVisible();
    await context.close();
  });
});

test.describe("record arc", () => {
  test.beforeEach(async ({ page }) => {
    test.slow();
    await skipIntro(page);
  });

  test("introduces itself, then a centre record is announced, with no accessibility problems", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("./pre-wedding/");
    await arc(page).scrollIntoViewIfNeeded();
    await expect(arc(page)).toHaveAttribute("data-state", "intro");
    await ready(page);
    await expect(arc(page)).toHaveAttribute("data-centre-name", /Sample/);
    await expect(page.locator('.wbsk-arc__item[data-centre="true"]')).toHaveCount(1);
    expect(errors).toEqual([]);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  test("keyboard: arrows move a record, Enter opens, and the page never scrolls sideways", async ({
    page,
  }) => {
    await page.goto("./pre-wedding/");
    await arc(page).scrollIntoViewIfNeeded();
    await ready(page);
    const first = await arc(page).getAttribute("data-centre-name");
    await arc(page).focus();
    await page.keyboard.press("ArrowRight");
    await expect(arc(page)).not.toHaveAttribute("data-centre-name", first!, { timeout: MOVE_TIMEOUT });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/pre-wedding\/sample-/, { timeout: MOVE_TIMEOUT });
    await expect(page.locator("h1")).toContainText("Sample");
  });

  test("the wheel moves records, and at the last record the page takes over", async ({
    page,
    browserName,
  }) => {
    test.skip(isPhone(page) || browserName === "webkit", "Mouse wheel, computers; WebKit's test wheel differs.");
    await page.goto("./pre-wedding/");
    await arc(page).scrollIntoViewIfNeeded();
    await ready(page);
    const box = (await arc(page).boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const start = await arc(page).getAttribute("data-centre-name");
    await page.mouse.wheel(0, 120);
    await expect(arc(page)).not.toHaveAttribute("data-centre-name", start!, { timeout: MOVE_TIMEOUT });
    for (let i = 0; i < 8; i += 1) {
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(1200);
    const before = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 200);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
  });

  test("clicking a side record centres it; clicking the centre opens it; return rebuilds around it", async ({
    page,
  }) => {
    test.skip(isPhone(page), "Computers; phones are covered by swipe below.");
    await page.goto("./pre-wedding/");
    await arc(page).scrollIntoViewIfNeeded();
    await ready(page);
    const start = await arc(page).getAttribute("data-centre-name");
    const box = (await arc(page).boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.15, box.y + box.height * 0.55);
    await expect(arc(page)).not.toHaveAttribute("data-centre-name", start!, { timeout: MOVE_TIMEOUT });
    await atRest(page);
    const chosen = await arc(page).getAttribute("data-centre-name");

    const centre = await page.locator('.wbsk-arc__item[data-centre="true"] [data-rig]').boundingBox();
    await page.mouse.click(centre!.x + centre!.width * 0.3, centre!.y + centre!.height / 2);
    await expect(page).toHaveURL(/pre-wedding\/sample-/, { timeout: MOVE_TIMEOUT });
    await expect(page.locator("h1")).toHaveText(chosen!);

    await page.getByRole("link", { name: "Back to the records" }).click();
    await expect(page).toHaveURL(/pre-wedding\/$/, { timeout: 5000 });
    await ready(page);
    await expect(arc(page)).toHaveAttribute("data-centre-name", chosen!);
  });

  test("a sideways swipe moves records; nothing is trapped", async ({ page, browserName }) => {
    test.skip(!isPhone(page) || browserName !== "chromium", "Touch, phone width.");
    await page.goto("./pre-wedding/");
    await arc(page).scrollIntoViewIfNeeded();
    await ready(page);
    const start = await arc(page).getAttribute("data-centre-name");
    const box = (await arc(page).boundingBox())!;
    const y = box.y + box.height / 2;
    await page.evaluate(
      ([x0, x1, py]) => {
        const target = document.querySelector(".wbsk-arc")!;
        const fire = (type: string, clientX: number) =>
          target.dispatchEvent(
            new PointerEvent(type, { bubbles: true, pointerType: "touch", clientX, clientY: py }),
          );
        fire("pointerdown", x0!);
        fire("pointermove", (x0! + x1!) / 2);
        fire("pointermove", x1!);
        fire("pointerup", x1!);
      },
      [box.x + box.width * 0.85, box.x + box.width * 0.15, y],
    );
    await expect(arc(page)).not.toHaveAttribute("data-centre-name", start!, { timeout: MOVE_TIMEOUT });
  });

  for (const count of [1, 2, 3, 5]) {
    test(`works with ${count} record${count === 1 ? "" : "s"}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`./pre-wedding/?records=${count}`);
      await arc(page).scrollIntoViewIfNeeded();
      await ready(page);
      await expect(page.locator(".wbsk-arc__item")).toHaveCount(count);
      await expect(page.locator('.wbsk-arc__item[data-centre="true"]')).toHaveCount(1);
      expect(errors).toEqual([]);
    });
  }

  test("reduced motion gets a plain row of real links", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./pre-wedding/");
    await expect(page.locator(".wbsk-arc__row a").first()).toBeVisible();
    await expect(page.locator(".wbsk-arc__item")).toHaveCount(0);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  test("without scripts the destinations are still real links", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4173/wbsk_website_2.0/pre-wedding/");
    await expect(page.locator(".wbsk-arc__row a").first()).toBeVisible();
    await context.close();
  });
});
