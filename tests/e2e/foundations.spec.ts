import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const pages = ["", "weddings/", "films/", "pre-wedding/", "our-team/", "careers/", "privacy/"];
const isPhone = (page: Page) => (page.viewportSize()?.width ?? 0) < 900;

for (const path of pages) {
  test(`/${path} loads cleanly, has one heading and no accessibility problems`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("header img")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
    expect(errors).toEqual([]);
  });

  test(`/${path} doesn't scroll sideways and reads without scripts`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.goto(`${baseURL}${path}`);
    await expect(page.locator("h1")).toBeVisible();
    expect(await page.locator("h1").evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await context.close();
  });
}

test("every page is kept out of Google on the temporary address", async ({ page, request }) => {
  await page.goto("");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const robots = await (await request.get("robots.txt")).text();
  expect(robots).toMatch(/Disallow: \//);
});

test("the menu reaches every page, and the header stays in place", async ({ page }) => {
  await page.goto("weddings/");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => {
    document.querySelector("header")?.setAttribute("data-marker", "kept");
  });
  for (const [label, path] of [
    ["Films", "films/"],
    ["Our team", "our-team/"],
    ["Careers", "careers/"],
    ["Pre-wedding", "pre-wedding/"],
    ["Weddings", "weddings/"],
  ] as const) {
    if (isPhone(page)) {
      await page.getByRole("button", { name: "Open menu" }).click();
      await page.getByRole("dialog").getByRole("link", { name: label }).click();
    } else {
      await page
        .getByRole("navigation", { name: "Main" })
        .getByRole("link", { name: label })
        .click();
    }
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.locator("h1")).toHaveText(label);
  }
  await expect(page.locator("header")).toHaveAttribute("data-marker", "kept");
});

test("browser Back and Forward change pages with the header held", async ({ page }) => {
  await page.goto("weddings/");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.querySelector("header")?.setAttribute("data-marker", "kept"));
  await page.locator("footer").getByRole("link", { name: "Films" }).click();
  await expect(page.locator("h1")).toHaveText("Films");
  await page.goBack();
  await expect(page.locator("h1")).toHaveText("Weddings");
  const hasTransitions = await page.evaluate(
    () => typeof document.startViewTransition === "function",
  );
  if (hasTransitions) {
    await expect(page.locator("html")).toHaveAttribute("data-page-direction", "back");
  }
  await page.goForward();
  await expect(page.locator("h1")).toHaveText("Films");
  await expect(page.locator("header")).toHaveAttribute("data-marker", "kept");
});

test("the page changes without a transition under reduced motion", async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}weddings/`);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => {
    const original = document.startViewTransition?.bind(document);
    (window as unknown as { calls: number }).calls = 0;
    if (original) {
      document.startViewTransition = ((cb: never) => {
        (window as unknown as { calls: number }).calls += 1;
        return original(cb);
      }) as typeof document.startViewTransition;
    }
  });
  await page.locator("footer").getByRole("link", { name: "Films" }).click();
  await expect(page.locator("h1")).toHaveText("Films");
  expect(await page.evaluate(() => (window as unknown as { calls: number }).calls)).toBe(0);
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight >= window.innerHeight),
  ).toBe(true);
  await context.close();
});

test("reduced motion shows everything straight away", async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}`);
  await page.waitForLoadState("networkidle");
  await expect(page.locator("[data-reveal]")).toHaveCount(0);
  const parallax = page.locator("[data-parallax] img");
  expect(await parallax.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  await context.close();
});

test("the keyboard can reach everything, with a visible focus ring", async ({
  page,
  browserName,
}) => {
  // Safari only tabs to links with this setting's shortcut.
  const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
  await page.goto("weddings/");
  await page.keyboard.press(tab);
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press(tab);
  const logo = page.getByRole("link", { name: /home/ }).first();
  await expect(logo).toBeFocused();
  const outline = await logo.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).toBe("solid");
});

test("the phone menu traps focus, closes with Escape and returns focus", async ({
  page,
  browserName,
}) => {
  test.skip(!isPhone(page), "The menu icon only shows below 900px");
  await page.goto("weddings/");
  await page.waitForLoadState("networkidle");
  const open = page.getByRole("button", { name: "Open menu" });
  await open.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  for (let i = 0; i < 7; i += 1) {
    await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
    const inside = await page.evaluate(() => {
      const active = document.activeElement;
      return !active || active === document.body || Boolean(active.closest("dialog"));
    });
    expect(inside).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(open).toBeFocused();
});

test("Enquire stays visible, including inside the phone menu", async ({ page }) => {
  await page.goto("films/");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("header").getByRole("link", { name: "Enquire" })).toBeVisible();
  if (isPhone(page)) {
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("dialog").getByRole("link", { name: "Enquire" })).toBeVisible();
  }
});

test("spacing utilities win over component styles", async ({ page }) => {
  await page.goto("");
  const lead = page.locator("#enquire .wbsk-lead");
  expect(await lead.evaluate((el) => parseFloat(getComputedStyle(el).marginTop))).toBeGreaterThan(
    16,
  );
});

test("the header is clear over the hero, then solid", async ({ page }) => {
  await page.goto("");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("header")).toHaveAttribute("data-solid", "false");
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.2));
  await expect(page.locator("header")).toHaveAttribute("data-solid", "true");
});

test("sections below the screen rise in once, and stay", async ({ page }) => {
  await page.goto("");
  await page.waitForLoadState("networkidle");
  const target = page.locator("#enquire [data-reveal]");
  await expect(target).toHaveAttribute("data-reveal", "waiting");
  await target.scrollIntoViewIfNeeded();
  await expect(target).toHaveAttribute("data-reveal", "shown");
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(target).toHaveAttribute("data-reveal", "shown");
});

test("parallax moves the picture at 12–18% of scroll, and the frame stays", async ({ page }) => {
  await page.goto("");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => {
    const f = document.querySelector("[data-parallax]")!.getBoundingClientRect();
    window.scrollTo(0, window.scrollY + f.top + f.height / 2 - window.innerHeight / 2 - 40);
  });
  const read = () =>
    page.evaluate(() => {
      const f = document.querySelector("[data-parallax]")!.getBoundingClientRect();
      const i = document.querySelector("[data-parallax] img")!.getBoundingClientRect();
      return { frame: f.top, image: i.top, scroll: window.scrollY };
    });
  await page.waitForTimeout(800);
  const a = await read();
  await page.evaluate(() => window.scrollBy(0, 80));
  await page.waitForTimeout(800);
  const b = await read();
  const speed = Math.abs(b.image - b.frame - (a.image - a.frame)) / (b.scroll - a.scroll);
  expect(speed).toBeGreaterThanOrEqual(0.12);
  expect(speed).toBeLessThanOrEqual(0.18);
});

test("a mouse wheel notch glides to the same place, and a small trackpad step stays native", async ({
  page,
  browserName,
}) => {
  test.skip(isPhone(page), "Computers with a mouse only");
  test.skip(
    browserName !== "chromium",
    "Wheel simulation differs by engine; checked by hand in the others",
  );
  await page.goto("");
  await page.waitForLoadState("networkidle");
  await page.mouse.move(600, 400);
  await page.waitForTimeout(600);
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(80);
  const mid = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(700);
  const end = await page.evaluate(() => window.scrollY);
  expect(end).toBe(120);
  expect(mid).toBeLessThan(120);
  await page.waitForTimeout(400);
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 10);
  await page.waitForTimeout(120);
  const after = await page.evaluate(() => window.scrollY);
  expect(after - before).toBe(10);
});

test("unknown addresses get the designed not-found page", async ({ page }) => {
  const response = await page.goto("no-such-page/");
  expect(response?.status()).toBe(404);
  await expect(page.locator("h1")).toHaveText("This page isn’t here");
});
