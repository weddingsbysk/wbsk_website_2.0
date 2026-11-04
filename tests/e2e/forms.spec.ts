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

const chatIn = (page: Page, where = "#enquire") => page.locator(`${where} .wbsk-chat`);

/** One typed answer in the conversation. */
async function say(page: Page, text: string, where?: string) {
  const chat = chatIn(page, where);
  await chat.locator(".wbsk-chat__type input, .wbsk-chat__type textarea").fill(text);
  await chat.getByRole("button", { name: "Send this answer" }).click();
}

const pick = (page: Page, name: string, where?: string) =>
  chatIn(page, where).locator(".wbsk-chat__composer").getByRole("button", { name, exact: true }).click();

/** The whole conversation, up to the consent. */
async function talkThrough(page: Page, email = "meera@example.com") {
  await say(page, "Sample Meera");
  await say(page, "Udaipur");
  await pick(page, "2");
  await say(page, "February 2027");
  await pick(page, "Destination");
  await pick(page, "Haldi");
  await pick(page, "Done");
  await pick(page, "3");
  await pick(page, "100–250");
  await pick(page, "Photographs and film");
  await say(page, "+91 98765 43210");
  if (email) await say(page, email);
  else await pick(page, "Skip this one");
  await pick(page, "Skip this one");
  await expect(chatIn(page).locator(".wbsk-form__send")).toBeVisible();
}

const agree = (page: Page) => chatIn(page).locator(".wbsk-form__send");

test("the homepage ends with the chat open, packages above it, and no budget or package question", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#enquire .wbsk-packages li")).toHaveCount(3);
  await expect(page.locator("#enquire .wbsk-packages")).toContainText("Signature");
  await expect(chatIn(page)).toContainText("Please tell me your name.");
  await expect(chatIn(page)).not.toContainText(/budget|package/i);
  await expect(page.locator("#enquire .wbsk-form__next")).toContainText("We reply within a day");
});

test("it asks one question at a time, greets them, and asks what the owner asked for, in order", async ({ page }) => {
  await page.goto("./");
  const log = chatIn(page).locator(".wbsk-chat__log");
  await expect(log).not.toContainText("Where is your wedding destination?");
  await say(page, "Sample Meera Shah");
  await expect(log).toContainText("Lovely to meet you, Sample.");
  await expect(log).toContainText("Where is your wedding destination?");
  await expect(log).not.toContainText("How many cameramen do you need?");
  await say(page, "Udaipur");
  await expect(log).toContainText("Udaipur, beautiful.");
  await expect(log).toContainText("How many cameramen do you need?");
  await expect(chatIn(page).getByRole("button", { name: "Not sure, please suggest" })).toBeVisible();
});

test("an empty or wrong answer gets a kind note, and it clears when fixed", async ({ page }) => {
  await page.goto("./");
  const chat = chatIn(page);
  await chat.getByRole("button", { name: "Send this answer" }).click();
  await expect(chat.locator(".wbsk-field__error")).toContainText("your name");
  await expect(chat.locator(".wbsk-chat__log")).not.toContainText("Where is your wedding destination?");
  await say(page, "Sample Meera");
  await expect(chat.locator(".wbsk-field__error")).toHaveCount(0);
  await say(page, "Udaipur");
  await pick(page, "1");
  await say(page, "May 2027");
  await pick(page, "Destination");
  await pick(page, "Haldi");
  await pick(page, "Done");
  await pick(page, "3");
  await pick(page, "Under 100");
  await pick(page, "Film only");
  // With no number, the email can't be skipped.
  await pick(page, "Skip this one");
  await expect(chat.locator(".wbsk-chat__log")).toContainText("We need one way to reply");
  await expect(chat.getByRole("button", { name: "Skip this one" })).toHaveCount(0);
  await chat.getByRole("button", { name: "Send this answer" }).click();
  await expect(chat.locator(".wbsk-field__error")).toContainText("phone number or an email");
  await say(page, "meera@");
  await expect(chat.locator(".wbsk-field__error")).toContainText("looks incomplete");
});

test("the page holds still and the keyboard can do everything", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 760, "Keyboard.");
  await page.goto("./");
  const chat = chatIn(page);
  await chat.scrollIntoViewIfNeeded();
  const input = chat.locator(".wbsk-chat__type input");
  await input.focus();
  const y = await page.evaluate(() => window.scrollY);
  await page.keyboard.type("Sample Meera");
  await page.keyboard.press("Enter");
  await expect(chat.locator(".wbsk-chat__log")).toContainText("Where is your wedding destination?");
  await expect(input).toBeFocused();
  await page.keyboard.type("Udaipur");
  await page.keyboard.press("Enter");
  const first = chat.locator(".wbsk-chat__chip").first();
  await expect(first).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(chat.locator(".wbsk-chat__log")).toContainText("When is the wedding?");
  expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(y, -1);
});

test("an answer can be changed without losing the place", async ({ page }) => {
  const received = await connect(page);
  await page.goto("./");
  await talkThrough(page);
  const chat = chatIn(page);
  await chat.getByRole("button", { name: /Change your answer to: City or venue/ }).click({ force: true });
  await expect(chat.locator(".wbsk-chat__type input")).toHaveValue("Udaipur");
  await say(page, "Jaipur");
  await expect(chat.locator(".wbsk-chat__log")).toContainText("Jaipur");
  await expect(agree(page)).toBeVisible();
  await agree(page).click();
  await expect(page.locator('[data-form-state="sent"]')).toBeVisible();
  expect((received[0]!.values as Record<string, unknown>).place).toBe("Jaipur");
});

test("sending: sends once with the right answers, shows Sending, then the thank-you", async ({ page }) => {
  const received = await connect(page, "slow");
  await page.goto("./");
  await talkThrough(page);
  await agree(page).click();
  await expect(chatIn(page).getByRole("button", { name: "Sending…" })).toBeDisabled();
  const done = page.locator('[data-form-state="sent"]');
  await expect(done).toContainText("Thank you, Sample Meera.");
  await expect(done).toContainText("A copy of your details");
  await expect(done).toBeFocused();
  expect(received).toHaveLength(1);
  expect(received[0]).toMatchObject({ form: "wedding", consent: true, website: "" });
  const values = received[0]!.values as Record<string, unknown>;
  expect(values.names).toBe("Sample Meera");
  expect(values.place).toBe("Udaipur");
  expect(values.cameras).toBe("2");
  expect(values.events).toEqual(["Haldi"]);
  expect(values.weddingType).toBe("Destination");
  expect(received[0]!.openedFrom).toMatch(/wbsk_website_2\.0\/$/);
  await chatIn(page).getByRole("button", { name: "Send another enquiry" }).click();
  await expect(chatIn(page).locator(".wbsk-chat__log")).toContainText("Please tell me your name.");
  await expect(chatIn(page).locator(".wbsk-chat__log")).not.toContainText("Udaipur");
});

test("with no email the thank-you doesn't promise a copy", async ({ page }) => {
  await connect(page);
  await page.goto("./");
  await talkThrough(page, "");
  await agree(page).click();
  const done = page.locator('[data-form-state="sent"]');
  await expect(done).toContainText("We reply within a day");
  await expect(done).not.toContainText("A copy of your details");
});

test("failed: the answers stay, the backup contact shows, and Try again works", async ({ page }) => {
  await connect(page, "fail");
  await page.goto("./");
  await talkThrough(page);
  await agree(page).click();
  const failed = page.locator('[data-form-state="failed"]');
  await expect(failed).toContainText("Something went wrong on our side.");
  await expect(failed).toContainText("+91 90000 00000");
  await expect(failed).toContainText("hello@example.com");
  await expect(chatIn(page).locator(".wbsk-chat__log")).toContainText("Udaipur");
  await expect(chatIn(page).getByRole("button", { name: "Try again" })).toBeVisible();
});

test("not yet connected: it fails honestly and never pretends to have sent", async ({ page }) => {
  await page.route("**/forms.json", async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, json: { ...(await response.json()), endpoint: null } });
  });
  await page.goto("./");
  await talkThrough(page);
  await agree(page).click();
  await expect(page.locator('[data-form-state="failed"]')).toBeVisible();
  await expect(page.locator('[data-form-state="sent"]')).toHaveCount(0);
});

test("the Films page has the chat straight after the films", async ({ page }) => {
  const received = await connect(page);
  await page.goto("./films/");
  const chat = page.locator(".wbsk-enquiry .wbsk-chat");
  await expect(chat).toContainText("Please tell me your name.");
  await expect(page.locator(".wbsk-enquiry .wbsk-packages li")).toHaveCount(3);
  await say(page, "Sample Tara", ".wbsk-enquiry");
  await expect(chat).toContainText("Where is your wedding destination?");
  expect(received).toHaveLength(0);
});

test("the panel slides up over any page, keeps the conversation when closed, and Back closes it", async ({ page }) => {
  await connect(page);
  await page.goto("./weddings/");
  await page.getByRole("link", { name: "Enquire" }).first().click();
  const panel = page.locator(".wbsk-panel");
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute("data-open", "true");
  await expect(panel.locator(".wbsk-packages--row li")).toHaveCount(3);
  await expect(page).toHaveURL(/weddings\/$/);
  await say(page, "Sample Tara", ".wbsk-panel");
  await expect(panel.locator(".wbsk-chat__log")).toContainText("Where is your wedding destination?");
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await page.getByRole("link", { name: "Enquire" }).first().click();
  await expect(panel.locator(".wbsk-chat__log")).toContainText("Sample Tara");
  await expect(panel.locator(".wbsk-chat__log")).toContainText("Where is your wedding destination?");
  await page.goBack();
  await expect(panel).toBeHidden();
  await expect(page).toHaveURL(/weddings\/$/);
  await expect(page.locator("h1")).toHaveCount(1);
});

test("the chat has no accessibility problems, in the panel and part-way through", async ({ page }) => {
  await page.goto("./weddings/");
  await page.getByRole("link", { name: "Enquire" }).first().click();
  const panel = page.locator(".wbsk-panel");
  await expect(panel.locator(".wbsk-chat")).toBeVisible();
  await say(page, "Sample Meera", ".wbsk-panel");
  await say(page, "Udaipur", ".wbsk-panel");
  await expect(panel.getByRole("button", { name: "Not sure, please suggest" })).toBeVisible();
  await page.waitForTimeout(700);
  const results = await new AxeBuilder({ page })
    .include(".wbsk-panel")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
});

test("with reduced motion the next question comes at once", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await say(page, "Sample Meera");
  const chat = chatIn(page);
  await expect(chat.locator(".wbsk-chat__dots")).toHaveCount(0);
  await expect(chat.locator(".wbsk-chat__log")).toContainText("Where is your wedding destination?");
});

test("pre-wedding pages open the pre-wedding chat, in its own words, with no destination filled in", async ({ page }) => {
  await page.goto("./pre-wedding/sample-goa/");
  await page.getByRole("link", { name: "Enquire" }).first().click();
  const panel = page.locator(".wbsk-panel");
  await expect(panel.getByRole("heading", { name: "Plan your pre-wedding" })).toBeVisible();
  await expect(panel.locator(".wbsk-packages--row")).toHaveCount(0);
  await expect(panel.locator(".wbsk-chat")).not.toContainText(/budget/i);
  await say(page, "Sample Tara", ".wbsk-panel");
  await expect(panel.locator(".wbsk-chat__log")).toContainText("Where would you like to shoot?");
  await expect(panel.locator(".wbsk-chat__type input")).toHaveValue("");
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
