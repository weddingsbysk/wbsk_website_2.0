import { EMPTY_RATES, estimateQuote, quoteMessage, ratesAreSet, rupees, sanityProject, type Coverage, type QuoteRates } from "@wbsk/content";
import { useEffect, useMemo, useState } from "react";
import { useClient } from "../components/studio-hooks";

const API = "2026-11-01";
/** A dot in the ID keeps a document away from anyone not signed in, even in a public dataset. */
const RATES_ID = "private.quoteRates";
const COVERAGE: [Coverage, string][] = [["both", "Photographs and film"], ["photo", "Photographs only"], ["film", "Film only"]];
const CAMERAS = [1, 2, 3, 4, 5, 6];
const GUESTS = ["Under 100", "100–250", "250–500", "500+"];

type Saved = "idle" | "saving" | "saved" | "unconfirmed" | "failed" | "exposed";

/** Asks the public address, signed out, whether it can see the prices. It must not. */
async function publicCanSeeRates() {
  const query = encodeURIComponent(`*[_id == "${RATES_ID}"]{_id}`);
  const response = await fetch(`https://${sanityProject.projectId}.api.sanity.io/v${API}/data/query/${sanityProject.dataset}?query=${query}`, { credentials: "omit" });
  if (!response.ok) throw new Error("check failed");
  const { result } = (await response.json()) as { result: unknown[] };
  return result.length > 0;
}

function Money({ label, value, onChange, note }: { label: string; value: number; onChange: (value: number) => void; note?: string }) {
  return (
    <label className="st-q__field">
      <span>{label}</span>
      <input type="number" min={0} inputMode="numeric" value={value || ""} placeholder="0" onChange={(event) => onChange(Number(event.target.value) || 0)} />
      {note ? <small>{note}</small> : null}
    </label>
  );
}

function Text({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="st-q__field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Chips<T extends string | number | null>({ label, options, value, onChange }: { label: string; options: [T, string][]; value: T; onChange: (value: T) => void }) {
  return (
    <div className="st-q__field" role="group" aria-label={label}>
      <span>{label}</span>
      <div className="st-q__chips">
        {options.map(([option, text]) => (
          <button key={text} type="button" className="st-q__chip" aria-pressed={option === value} onClick={() => onChange(option)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Works out a rough estimate from a finished chat, ready to send on WhatsApp or by email. */
export function QuotesTool() {
  const client = useClient({ apiVersion: API });
  const [rates, setRates] = useState<QuoteRates>(EMPTY_RATES);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState<Saved>("idle");
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [date, setDate] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [coverage, setCoverage] = useState<Coverage>("both");
  const [cameras, setCameras] = useState<number | null>(2);
  const [days, setDays] = useState(2);
  const [destination, setDestination] = useState(false);
  const [guests, setGuests] = useState("100–250");
  const [extra, setExtra] = useState(0);
  const [editedMessage, setEditedMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    void client.getDocument(RATES_ID).then((document) => {
      if (!live) return;
      if (document) setRates({ ...EMPTY_RATES, ...(document as unknown as Partial<QuoteRates>) });
      else setEditing(true);
      setLoaded(true);
    });
    return () => {
      live = false;
    };
  }, [client]);

  const ready = ratesAreSet(rates);
  const estimate = useMemo(
    () => estimateQuote(rates, { coverage, cameras, days, destination, guests, extra }),
    [rates, coverage, cameras, days, destination, guests, extra],
  );
  const generated = quoteMessage({ name, place, date, low: estimate.low, high: estimate.high });
  const message = editedMessage ?? generated;
  const whatsAppDigits = phone.replace(/\D/g, "");
  const whatsApp = /^[6-9]\d{9}$/.test(whatsAppDigits) ? `91${whatsAppDigits}` : whatsAppDigits;

  const setRate = (change: Partial<QuoteRates>) => {
    setSaved("idle");
    setRates((current) => ({ ...current, ...change }));
  };

  const save = async () => {
    setSaved("saving");
    try {
      await client.createOrReplace({ ...rates, _id: RATES_ID, _type: "quoteRates" });
    } catch {
      setSaved("failed");
      return;
    }
    try {
      if (await publicCanSeeRates()) {
        // Should never happen; if it ever does, the prices don't stay readable.
        await client.delete(RATES_ID);
        setSaved("exposed");
        return;
      }
      setSaved("saved");
      setEditing(false);
    } catch {
      setSaved("unconfirmed");
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="st-page">
      <div className="st-page__inner st-q">
        <header className="st-q__head st-rise">
          <h1 className="st-title">Quotes</h1>
          <p>Fill in what the couple told the chat, and send them a rough estimate. Nothing about a couple is saved here.</p>
        </header>

        <div className="st-q__grid">
          <section className="st-panel st-rise" aria-label="The enquiry">
            <h2>The enquiry</h2>
            <div className="st-q__pair">
              <Text label="Name" value={name} onChange={setName} />
              <Text label="Destination" value={place} onChange={setPlace} />
              <Text label="Wedding date" value={date} onChange={setDate} />
              <Text label="Phone (WhatsApp)" type="tel" value={phone} onChange={setPhone} />
              <Text label="Email" type="email" value={email} onChange={setEmail} />
              <Money label="Extras (₹)" value={extra} onChange={setExtra} note="Anything else to add for this couple." />
            </div>
            <Chips label="What they'd like" options={COVERAGE} value={coverage} onChange={setCoverage} />
            <Chips<number | null> label="Cameramen" options={[...CAMERAS.map((count): [number, string] => [count, String(count)]), [null, "Not sure"]]} value={cameras} onChange={setCameras} />
            <div className="st-q__pair">
              <label className="st-q__field">
                <span>Days</span>
                <input type="number" min={1} max={14} value={days} onChange={(event) => setDays(Math.max(1, Number(event.target.value) || 1))} />
              </label>
              <Chips<string> label="Where" options={[["city", "In their city"], ["destination", "Destination"]]} value={destination ? "destination" : "city"} onChange={(where) => setDestination(where === "destination")} />
            </div>
            <Chips label="Guests" options={GUESTS.map((item): [string, string] => [item, item])} value={guests} onChange={setGuests} />
          </section>

          <section className="st-panel st-q__result st-rise" aria-label="Rough estimate" aria-live="polite">
            <h2>Rough estimate</h2>
            {!loaded ? <p className="st-empty">Loading your prices…</p> : null}
            {loaded && !ready ? <p className="st-empty">Add your prices below, and the estimate appears here.</p> : null}
            {loaded && ready ? (
              <>
                <p className="st-q__range">
                  {rupees(estimate.low)} <span>to</span> {rupees(estimate.high)}
                </p>
                <table className="st-q__lines">
                  <caption className="st-q__sr">How this was worked out</caption>
                  <tbody>
                    {estimate.lines.map((line) => (
                      <tr key={line.label}>
                        <th scope="row">{line.label}</th>
                        <td>{rupees(line.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {cameras === null ? <p className="st-q__note">Using your suggested team of {estimate.cameras}.</p> : null}
                <label className="st-q__field">
                  <span>Message to send</span>
                  <textarea rows={9} value={message} onChange={(event) => setEditedMessage(event.target.value)} />
                </label>
                {editedMessage !== null ? (
                  <button type="button" className="st-q__link" onClick={() => setEditedMessage(null)}>
                    Back to the automatic wording
                  </button>
                ) : null}
                <div className="st-q__send">
                  <button type="button" className="st-q__button" onClick={() => void copy()}>
                    {copied ? "Copied" : "Copy message"}
                  </button>
                  {whatsApp.length >= 8 ? (
                    <a className="st-q__button st-q__button--quiet" href={`https://wa.me/${whatsApp}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
                      Open in WhatsApp ↗
                    </a>
                  ) : null}
                  {email.includes("@") ? (
                    <a className="st-q__button st-q__button--quiet" href={`mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent("Your wedding: a rough estimate from WBSK")}&body=${encodeURIComponent(message)}`}>
                      Open in email ↗
                    </a>
                  ) : null}
                </div>
              </>
            ) : null}
          </section>
        </div>

        <section className="st-panel st-rise" aria-label="Your prices">
          <div className="st-q__priceshead">
            <h2>Your prices</h2>
            <button type="button" className="st-q__link" aria-expanded={editing} onClick={() => setEditing(!editing)}>
              {editing ? "Hide" : "Change prices"}
            </button>
          </div>
          <p className="st-q__note">Saved privately: only people signed in to this Studio can see them, never website visitors.</p>
          {saved === "saved" ? <p className="st-q__note" role="status">Saved. Checked: the public can&rsquo;t see them.</p> : null}
          {saved === "unconfirmed" ? <p className="st-q__alert" role="alert">Saved, but the privacy check couldn&rsquo;t run. Please press Save again.</p> : null}
          {saved === "failed" ? <p className="st-q__alert" role="alert">That didn&rsquo;t save. Your prices are still here; please try again.</p> : null}
          {saved === "exposed" ? <p className="st-q__alert" role="alert">The prices looked public, so they weren&rsquo;t kept. Please tell your developer before trying again.</p> : null}
          {editing ? (
            <>
              <h3>For one cameraman, for one day</h3>
              <div className="st-q__trio">
                {COVERAGE.map(([key, label]) => (
                  <Money key={key} label={label} value={rates.dayRate[key]} onChange={(value) => setRate({ dayRate: { ...rates.dayRate, [key]: value } })} />
                ))}
              </div>
              <h3>A fixed amount for each wedding</h3>
              <div className="st-q__trio">
                {COVERAGE.map(([key, label]) => (
                  <Money key={key} label={label} value={rates.baseFee[key]} onChange={(value) => setRate({ baseFee: { ...rates.baseFee, [key]: value } })} />
                ))}
              </div>
              <h3>Larger weddings, added percentage</h3>
              <div className="st-q__trio">
                {GUESTS.map((item) => (
                  <Money key={item} label={item} value={rates.guestUplift[item] ?? 0} onChange={(value) => setRate({ guestUplift: { ...rates.guestUplift, [item]: value } })} />
                ))}
              </div>
              <h3>Everything else</h3>
              <div className="st-q__trio">
                <Money label="Travel and stay, per person per day (₹)" value={rates.travelPerPersonDay} onChange={(value) => setRate({ travelPerPersonDay: value })} note="Destination weddings only, with one extra day." />
                <Money label="Range either side (%)" value={rates.spreadPercent} onChange={(value) => setRate({ spreadPercent: value })} />
                <Money label="Tax (%)" value={rates.taxPercent} onChange={(value) => setRate({ taxPercent: value })} />
                <Money label="Team when they're not sure" value={rates.suggestedCameras} onChange={(value) => setRate({ suggestedCameras: value })} />
                <Money label="Round to the nearest (₹)" value={rates.roundTo} onChange={(value) => setRate({ roundTo: value })} />
              </div>
              <button type="button" className="st-q__button" disabled={saved === "saving"} onClick={() => void save()}>
                {saved === "saving" ? "Saving…" : "Save prices"}
              </button>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
