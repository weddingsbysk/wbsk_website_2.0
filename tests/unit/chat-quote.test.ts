import { answerProblem, askFor, canSkip, chatSteps, estimateQuote, quoteMessage, ratesAreSet, replyFor, rupees, withCameraQuestion, EMPTY_RATES, type FormConfig, type QuoteRates } from "@wbsk/content";
import { describe, expect, it } from "vitest";

const config: FormConfig = withCameraQuestion({
  kind: "wedding",
  heading: "",
  button: "",
  nextSteps: [],
  thankYouHeading: "",
  thankYouText: "",
  consent: "",
  questions: [
    { key: "names", label: "Your names", kind: "text", locked: true, required: true },
    { key: "date", label: "Wedding date", kind: "text", required: true },
    { key: "place", label: "City or venue", kind: "text", required: true },
    { key: "phone", label: "Phone", kind: "phone", locked: true },
    { key: "email", label: "Email", kind: "email", locked: true },
    { key: "guests", label: "Guests", kind: "one", choices: ["Under 100"], shown: false },
    { key: "message", label: "Anything", kind: "long" },
  ],
});
const step = (key: string) => chatSteps(config).find((item) => item.key === key)!;

describe("the chat", () => {
  it("asks who, where and how many first, leaves contact late, and drops what the Studio hid", () => {
    expect(chatSteps(config).map((item) => item.key)).toEqual(["names", "place", "cameras", "date", "phone", "email", "message"]);
    expect(step("names").ask).toBe("Please tell me your name.");
    expect(step("place").ask).toBe("Where is your wedding destination?");
    expect(step("cameras").ask).toBe("How many cameramen do you need?");
  });

  it("uses the Studio's wording when it's been filled in", () => {
    const worded = { ...config, questions: config.questions.map((q) => (q.key === "place" ? { ...q, ask: "Where to?", reply: "[answer]!" } : q)) };
    const place = chatSteps(worded).find((item) => item.key === "place")!;
    expect(place.ask).toBe("Where to?");
    expect(replyFor(place, { place: "Goa" })).toBe("Goa!");
  });

  it("greets by first name and stays quiet after a skipped answer", () => {
    expect(replyFor(step("names"), { names: "Meera Shah" })).toBe("Lovely to meet you, Meera.");
    expect(replyFor(step("phone"), {})).toBeNull();
  });

  it("doesn't add the cameramen question twice, or to careers", () => {
    expect(withCameraQuestion(config).questions.filter((q) => q.key === "cameras")).toHaveLength(1);
    expect(withCameraQuestion({ ...config, kind: "careers", questions: [] }).questions).toHaveLength(0);
  });

  it("needs a name and one way to reply, and checks each as it's given", () => {
    expect(answerProblem(config, step("names"), { names: "" }, true)).toContain("your name");
    expect(answerProblem(config, step("names"), { names: "Meera" }, true)).toBeNull();
    expect(answerProblem(config, step("phone"), {}, true)).toBeNull();
    expect(answerProblem(config, step("phone"), { phone: "12" }, true)).toContain("too short");
    expect(answerProblem(config, step("email"), {}, false)).toContain("phone number or an email");
    expect(answerProblem(config, step("email"), { phone: "9876543210" }, false)).toBeNull();
    expect(answerProblem(config, step("email"), { phone: "9876543210", email: "meera@" }, false)).toContain("incomplete");
    expect(answerProblem(config, step("phone"), {}, false)).toContain("phone number or an email");
  });

  it("only lets the email be skipped when there's a number", () => {
    expect(canSkip(step("email"), {})).toBe(false);
    expect(canSkip(step("email"), { phone: "9876543210" })).toBe(true);
    expect(canSkip(step("names"), {})).toBe(false);
    expect(canSkip(step("cameras"), {})).toBe(true);
    expect(askFor(step("email"), {})).toContain("one way to reply");
    expect(askFor(step("email"), { phone: "1" })).toContain("copy");
  });
});

// Made-up numbers, for the arithmetic only.
const rates: QuoteRates = {
  baseFee: { both: 100, photo: 50, film: 60 },
  dayRate: { both: 10, photo: 5, film: 6 },
  travelPerPersonDay: 2,
  guestUplift: { "500+": 10 },
  spreadPercent: 10,
  taxPercent: 0,
  suggestedCameras: 3,
  roundTo: 1,
};
const input = { coverage: "both" as const, cameras: 2, days: 3, destination: false, guests: "100–250", extra: 0 };

describe("the quote", () => {
  it("adds the base fee to cameramen times days, with a range either side", () => {
    const quote = estimateQuote(rates, input);
    expect(quote.lines.map((line) => line.amount)).toEqual([100, 60]);
    expect([quote.low, quote.high]).toEqual([144, 176]);
  });

  it("adds travel for a destination, with one extra day", () => {
    expect(estimateQuote(rates, { ...input, destination: true }).lines[2]).toEqual({ label: "Travel and stay", amount: 16 });
  });

  it("adds the uplift for a larger wedding, then extras and tax", () => {
    const quote = estimateQuote({ ...rates, taxPercent: 10, spreadPercent: 0 }, { ...input, guests: "500+", extra: 24 });
    expect(quote.lines.map((line) => line.amount)).toEqual([100, 60, 16, 24, 20]);
    expect(quote.low).toBe(220);
  });

  it("uses the suggested team when the couple isn't sure", () => {
    expect(estimateQuote(rates, { ...input, cameras: null }).cameras).toBe(3);
  });

  it("rounds, and knows when no prices are set", () => {
    const quote = estimateQuote({ ...rates, spreadPercent: 0, roundTo: 50 }, input);
    expect(quote.low).toBe(150);
    expect(ratesAreSet(EMPTY_RATES)).toBe(false);
    expect(ratesAreSet(rates)).toBe(true);
  });

  it("writes amounts the Indian way, and the message says it's only a rough figure", () => {
    expect(rupees(1250000)).toBe("₹12,50,000");
    const text = quoteMessage({ name: "Meera Shah", place: "Udaipur", date: "February 2027", low: 100000, high: 200000 });
    expect(text).toContain("Hi Meera");
    expect(text).toContain("₹1,00,000 to ₹2,00,000");
    expect(text).toContain("final amount");
  });
});
