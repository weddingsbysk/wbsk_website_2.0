import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const STAND_IN = "https://script.google.test/exec";

/** A stand-in for the owner's Google script, so every state is tested before it's connected. */
async function connect(page: Page, reply: "ok" | "fail" | "slow" = "ok") {
  const received: Record<string, unknown>[] = [];
  await page.route("**/forms.json", async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    await route.fulfill({
      response,
      json: { ...json, endpoint: STAND_IN, backupWhatsApp: "+91 90000 00000", backupEmail: "hello@example.com" },
    });
  });
  await page.route(`${STAND_IN}*`, async (route) => {
    received.push(JSON.parse(route.request().postData() ?? "{}"));
    if (reply === "slow") await new Promise((resolve) => setTimeout(resolve, 900));
    await route.fulfill({
      status: 200,
      headers: { "access-control-allow-origin": "*" },
      contentType: "application/json",
      body: JSON.stringify({ ok: reply !== "fail" }),
    });
  });
  return received;
}

test.beforeEach(async ({ page }) => {
  test.slow();
  await page.addInitScript(() => sessionStorage.setItem("wbsk-intro-skip-for-tests", "1"));
});

const homeForm = (page: Page) => page.locator("#enquire form");

test("the homepage ends with the form open, packages above it, and no budget or package question", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#enquire .wbsk-packages li")).toHaveCount(3);
  await expect(page.locator("#enquire .wbsk-packages")).toContainText("Signature");
  await expect(homeForm(page)).toContainText("Which events?");
  await expect(homeForm(page)).not.toContainText(/budget|package/i);
  await expect(page.locator("#enquire .wbsk-form__next")).toContainText("We reply within a day");
});

test("missing answers: a note under each, a summary, the cursor on the first, and notes clear when fixed", async ({ page }) => {
  await connect(page);
  await page.goto("./");
  const form = homeForm(page);
  await form.getByRole("button", { name: /Send your enquiry/ }).click();
  await expect(form.getByRole("alert")).toContainText("A few details need a look");
  await expect(form.locator('[data-field="names"] .wbsk-field__error')).toHaveText("Add your names.");
  await expect(form.locator('[data-field="phone"] .wbsk-field__error')).toContainText("phone number or an email");
  await expect(form.locator('[data-field="consent"] .wbsk-field__error')).toBeVisible();
  await expect(form.locator('[data-field="names"] input')).toBeFocused();
  await form.locator('[data-field="names"] input').fill("Meera & Arjun");
  await expect(form.locator('[data-field="names"] .wbsk-field__error')).toHaveCount(0);
  await form.locator('[data-field="email"] input').fill("meera@");
  await form.getByRole("button", { name: /Send your enquiry/ }).click();
  await expect(form.locator('[data-field="email"] .wbsk-field__error')).toContainText("looks incomplete");
});

async function fillWedding(page: Page, email = "meera@example.com") {
  const form = homeForm(page);
  await form.locator('[data-field="names"] input').fill("Sample Meera & Sample Arjun");
  await form.locator('[data-field="date"] input').fill("February 2027");
  await form.locator('[data-field="place"] input').fill("Udaipur");
  await form.locator('[data-field="phone"] input').fill("+91 98765 43210");
  if (email) await form.locator('[data-field="email"] input').fill(email);
  await form.getByRole("checkbox", { name: "Haldi" }).check({ force: true });
  await form.getByRole("radio", { name: "Destination" }).check({ force: true });
  await form.locator('[data-field="consent"] input').check();
}

test("sending: sends once with the right answers, shows Sending, then the thank-you", async ({ page }) => {
  const received = await connect(page, "slow");
  await page.goto("./");
  await fillWedding(page);
  await page.waitForTimeout(100);
  const send = homeForm(page).getByRole("button", { name: /Send your enquiry/ });
  await send.click();
  await expect(homeForm(page).getByRole("button", { name: "Sending…" })).toBeDisabled();
  const done = page.locator('[data-form-state="sent"]');
  await expect(done).toContainText("Thank you, Sample Meera & Sample Arjun.");
  await expect(done).toContainText("A copy of your details");
  await expect(done).toBeFocused();
  expect(received).toHaveLength(1);
  expect(received[0]).toMatchObject({ form: "wedding", consent: true, website: "" });
  const values = received[0]!.values as Record<string, unknown>;
  expect(values.events).toEqual(["Haldi"]);
  expect(values.weddingType).toBe("Destination");
  expect(received[0]!.openedFrom).toMatch(/wbsk_website_2\.0\/$/);
});

test("with no email the thank-you doesn't promise a copy", async ({ page }) => {
  await connect(page);
  await page.goto("./");
  await fillWedding(page, "");
  await homeForm(page).getByRole("button", { name: /Send your enquiry/ }).click();
  const done = page.locator('[data-form-state="sent"]');
  await expect(done).toContainText("We reply within a day");
  await expect(done).not.toContainText("A copy of your details");
});

test("failed: the details stay, the backup contact shows, and Try again works", async ({ page }) => {
  await connect(page, "fail");
  await page.goto("./");
  await fillWedding(page);
  await homeForm(page).getByRole("button", { name: /Send your enquiry/ }).click();
  const failed = page.locator('[data-form-state="failed"]');
  await expect(failed).toContainText("Something went wrong on our side.");
  await expect(failed).toContainText("+91 90000 00000");
  await expect(failed).toContainText("hello@example.com");
  await expect(homeForm(page).locator('[data-field="names"] input')).toHaveValue("Sample Meera & Sample Arjun");
  await expect(homeForm(page).getByRole("button", { name: "Try again" })).toBeVisible();
});

test("not yet connected: it fails honestly and never pretends to have sent", async ({ page }) => {
  await page.route("**/forms.json", async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, json: { ...(await response.json()), endpoint: null } });
  });
  await page.goto("./");
  await fillWedding(page);
  await homeForm(page).getByRole("button", { name: /Send your enquiry/ }).click();
  await expect(page.locator('[data-form-state="failed"]')).toBeVisible();
  await expect(page.locator('[data-form-state="sent"]')).toHaveCount(0);
});

test("the panel slides up over any page, keeps typing when closed, and Back closes it", async ({ page }) => {
  await connect(page);
  await page.goto("./films/");
  await page.getByRole("link", { name: "Enquire" }).first().click();
  const panel = page.locator(".wbsk-panel");
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute("data-open", "true");
  await expect(panel.locator(".wbsk-packages--row li")).toHaveCount(3);
  await expect(page).toHaveURL(/films\/$/);
  const names = panel.locator('[data-field="names"] input');
  await names.fill("Sample Tara");
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await page.getByRole("link", { name: "Enquire" }).first().click();
  await expect(panel.locator('[data-field="names"] input')).toHaveValue("Sample Tara");
  await page.goBack();
  await expect(panel).toBeHidden();
  await expect(page).toHaveURL(/films\/$/);
  await expect(page.locator("h1")).toHaveText("Films");
});

test("the panel has no accessibility problems", async ({ page }) => {
  await page.goto("./weddings/");
  await page.getByRole("link", { name: "Enquire" }).first().click();
  const panel = page.locator(".wbsk-panel");
  await expect(panel.locator("form")).toBeVisible();
  await page.waitForTimeout(700);
  const results = await new AxeBuilder({ page })
    .include(".wbsk-panel")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
});

test("pre-wedding pages open the pre-wedding form, with no destination filled in", async ({ page }) => {
  await page.goto("./pre-wedding/sample-goa/");
  await page.getByRole("link", { name: "Enquire" }).first().click();
  const panel = page.locator(".wbsk-panel");
  await expect(panel.getByRole("heading", { name: "Plan your pre-wedding" })).toBeVisible();
  await expect(panel.locator('[data-field="place"] input')).toHaveValue("");
  await expect(panel.locator(".wbsk-packages--row")).toHaveCount(0);
  await expect(panel.locator("form")).not.toContainText(/budget/i);
});

test("the careers form lists the Studio's open roles and sends as careers", async ({ page }) => {
  const received = await connect(page);
  await page.goto("./careers/");
  const form = page.locator(".wbsk-form form");
  await expect(form.getByRole("radio", { name: "Sample Lead Filmmaker" })).toHaveCount(1);
  await form.locator('[data-field="name"] input').fill("Sample Applicant");
  await form.getByRole("radio", { name: "Sample Lead Filmmaker" }).check({ force: true });
  await form.getByRole("radio", { name: "1–3" }).check({ force: true });
  await form.locator('[data-field="portfolio"] input').fill("example.com/work");
  await form.locator('[data-field="phone"] input').fill("+91 98765 43210");
  await form.locator('[data-field="email"] input').fill("applicant@example.com");
  await form.locator('[data-field="consent"] input').check();
  await form.getByRole("button", { name: /Send your application/ }).click();
  await expect(page.locator('[data-form-state="sent"]')).toContainText("We've got your application");
  expect(received[0]).toMatchObject({ form: "careers" });
});

test("/#enquire opens the panel straight away, with no intro", async ({ browser, baseURL }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${baseURL}#enquire`);
  await expect(page.locator("html")).not.toHaveAttribute("data-intro", "play");
  await expect(page.locator(".wbsk-panel")).toBeVisible();
  await context.close();
});
