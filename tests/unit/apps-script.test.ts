import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

// The handler runs on Google, so its pure checks are loaded directly from the file the owner pastes.
const script = readFileSync("apps-script/Code.gs", "utf8");
const context = vm.createContext({});
vm.runInContext(script, context);
const call = <T>(name: string, ...args: unknown[]) => (context[name] as (...a: unknown[]) => T)(...args);

describe("Sheet script", () => {
  it("makes WhatsApp numbers the way the plan says", () => {
    expect(call("whatsAppNumber", "98765 43210")).toBe("919876543210");
    expect(call("whatsAppNumber", "+971 50 123 4567")).toBe("971501234567");
    expect(call("whatsAppNumber", "12345")).toBeNull();
    expect(call("whatsAppNumber", "")).toBeNull();
  });

  it("flags likely spam without losing a real couple", () => {
    const real = { website: "", elapsedMs: 90000, values: { message: "Two days in Udaipur" } };
    expect(call<string[]>("spamReasons", real)).toHaveLength(0);
    expect(call<string[]>("spamReasons", { ...real, website: "x" })[0]).toMatch(/trap/);
    expect(call<string[]>("spamReasons", { ...real, elapsedMs: 200 })[0]).toMatch(/seconds/);
    const links = "http://a.co http://b.co http://c.co http://d.co";
    expect(call<string[]>("spamReasons", { ...real, values: { message: links } })[0]).toMatch(/links/);
  });

  it("checks required answers against the published form", () => {
    const form = { questions: [{ key: "names", required: true, locked: true }, { key: "date", required: true }, { key: "guests", required: true, shown: false }] };
    expect(call<string[]>("missingAnswers", form, "wedding", { names: "A", date: "May", phone: "9" })).toHaveLength(0);
    expect(call<string[]>("missingAnswers", form, "wedding", { names: "A", phone: "9" })).toContain("date");
    expect(call<string[]>("missingAnswers", form, "wedding", { names: "A", date: "May" })).toContain("phone or email");
    expect(call<string[]>("missingAnswers", { questions: [] }, "careers", {})).toHaveLength(0);
  });

  it("writes the three subject lines from Decision 27", () => {
    expect(call("alertSubject", "wedding", { names: "Meera & Arjun", date: "February 2027" })).toBe("New WBSK wedding enquiry — Meera & Arjun, February 2027");
    expect(call("alertSubject", "preWedding", { names: "Meera & Arjun", date: "March 2027" })).toBe("New WBSK pre-wedding enquiry — Meera & Arjun, March 2027");
    expect(call("alertSubject", "careers", { name: "Asha", role: "Editor" })).toBe("New WBSK application — Asha, Editor");
  });

  it("never lets typed text act as a Sheet formula or as HTML", () => {
    expect(call("safeCell", "=IMPORTXML(1)")).toBe("'=IMPORTXML(1)");
    expect(call("safeCell", "+91 98765")).toBe("'+91 98765");
    expect(call("safeCell", "Meera")).toBe("Meera");
    expect(call("escapeHtml", "<b>&")).toBe("&lt;b&gt;&amp;");
  });
});
