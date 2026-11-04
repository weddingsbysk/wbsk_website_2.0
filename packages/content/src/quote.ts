/** The Studio's quotation maker. The prices themselves are never in this code: they're saved privately by the owner. */

export type Coverage = "both" | "photo" | "film";

export type QuoteRates = {
  /** A fixed amount for each kind of coverage: editing, album, film-making. */
  baseFee: Record<Coverage, number>;
  /** For one cameraman on one day. */
  dayRate: Record<Coverage, number>;
  /** Travel and stay for one person on one day, for destination weddings only. */
  travelPerPersonDay: number;
  /** Added percentage for larger weddings, by the form's guest choices. */
  guestUplift: Record<string, number>;
  /** How far either side of the middle the rough range runs. */
  spreadPercent: number;
  taxPercent: number;
  /** Used when a couple answers "Not sure". */
  suggestedCameras: number;
  roundTo: number;
};

export const EMPTY_RATES: QuoteRates = {
  baseFee: { both: 0, photo: 0, film: 0 },
  dayRate: { both: 0, photo: 0, film: 0 },
  travelPerPersonDay: 0,
  guestUplift: {},
  spreadPercent: 10,
  taxPercent: 0,
  suggestedCameras: 2,
  roundTo: 5000,
};

export type QuoteInput = {
  coverage: Coverage;
  cameras: number | null;
  days: number;
  destination: boolean;
  guests: string;
  extra: number;
};

export type QuoteLine = { label: string; amount: number };

const clean = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0);

function roundedTo(value: number, step: number) {
  return step > 0 ? Math.round(value / step) * step : Math.round(value);
}

export const ratesAreSet = (rates: QuoteRates) => Object.values(rates.dayRate).some((rate) => clean(rate) > 0);

/** The working behind a rough estimate, shown line by line so the team can trust it. */
export function estimateQuote(rates: QuoteRates, input: QuoteInput) {
  const cameras = input.cameras ?? clean(rates.suggestedCameras);
  const days = Math.max(1, clean(input.days));
  const lines: QuoteLine[] = [];
  const add = (label: string, amount: number) => {
    if (amount > 0) lines.push({ label, amount: Math.round(amount) });
  };
  add("Base fee", clean(rates.baseFee[input.coverage]));
  add(`${cameras} × ${days === 1 ? "1 day" : `${days} days`} of cameramen`, cameras * days * clean(rates.dayRate[input.coverage]));
  // The team arrives the day before, so a destination wedding is one day longer on the road.
  if (input.destination) add("Travel and stay", cameras * (days + 1) * clean(rates.travelPerPersonDay));
  const beforeGuests = lines.reduce((sum, line) => sum + line.amount, 0);
  add(`Larger wedding (${input.guests})`, (beforeGuests * clean(rates.guestUplift[input.guests] ?? 0)) / 100);
  add("Extras", clean(input.extra));
  const beforeTax = lines.reduce((sum, line) => sum + line.amount, 0);
  add("Tax", (beforeTax * clean(rates.taxPercent)) / 100);
  const middle = lines.reduce((sum, line) => sum + line.amount, 0);
  const spread = (middle * clean(rates.spreadPercent)) / 100;
  return { cameras, lines, low: roundedTo(middle - spread, rates.roundTo), high: roundedTo(middle + spread, rates.roundTo) };
}

/** Indian digit grouping, as couples will expect to read it. */
export const rupees = (amount: number) => `₹${Math.round(amount).toLocaleString("en-IN")}`;

export function quoteMessage(details: { name: string; place: string; date: string; low: number; high: number }) {
  const first = details.name.trim().split(/\s+/)[0] || "there";
  const about = [details.place.trim() && `in ${details.place.trim()}`, details.date.trim() && `in ${details.date.trim()}`].filter(Boolean).join(", ");
  return [
    `Hi ${first}, thank you for writing to us about your wedding${about ? ` ${about}` : ""}.`,
    "",
    `Based on what you've told us, a rough estimate is ${rupees(details.low)} to ${rupees(details.high)}.`,
    "",
    "This is only a starting point. Once we've spoken and understood your wedding properly, we'll send a plan made for you, with the final amount.",
    "",
    "When would be a good time for a short call?",
    "",
    "Weddings By Siddhant Kapoor",
  ].join("\n");
}
