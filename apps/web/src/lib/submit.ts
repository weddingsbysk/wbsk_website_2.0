import { publicAsset } from "./site";

export type FormsBundle = {
  forms: Record<"wedding" | "preWedding" | "careers", import("@wbsk/content").FormConfig>;
  packages: { name: string; line: string }[];
  endpoint: string | null;
  backupWhatsApp: string | null;
  backupEmail: string | null;
};

export const clockNow = () => Date.now();
export const newSubmissionId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

let bundle: Promise<FormsBundle> | null = null;

export function loadFormsBundle(): Promise<FormsBundle> {
  bundle ??= fetch(publicAsset("/forms.json")).then((response) => {
    if (!response.ok) throw new Error("forms unavailable");
    return response.json() as Promise<FormsBundle>;
  });
  bundle.catch(() => {
    bundle = null;
  });
  return bundle;
}

const IFRAME_WAIT_MS = 20000;

/**
 * The fallback for browsers that can't read the script's reply: a hidden form post, whose reply
 * tells this page the result. It's never "send and hope" (plan, section 6). The handler ignores a
 * repeated submission id, so a send that reached it the first time can't make two rows.
 */
function sendByFrame(endpoint: string, body: string) {
  return new Promise<boolean>((resolve) => {
    const name = `wbsk-send-${Date.now()}`;
    const frame = document.createElement("iframe");
    frame.name = name;
    frame.hidden = true;
    const form = document.createElement("form");
    form.method = "post";
    form.action = `${endpoint}?reply=frame`;
    form.target = name;
    form.hidden = true;
    const field = document.createElement("input");
    field.name = "payload";
    field.value = body;
    form.appendChild(field);
    const finish = (result: boolean) => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timer);
      frame.remove();
      form.remove();
      resolve(result);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.source === frame.contentWindow && event.data?.wbsk === "sent") finish(event.data.ok === true);
    };
    const timer = window.setTimeout(() => finish(false), IFRAME_WAIT_MS);
    window.addEventListener("message", onMessage);
    document.body.append(frame, form);
    form.submit();
  });
}

export async function sendForm(payload: Record<string, unknown>): Promise<boolean> {
  const { endpoint } = await loadFormsBundle();
  if (!endpoint) return false;
  const body = JSON.stringify(payload);
  try {
    // Plain text, which skips the browser's pre-check that Apps Script can't answer.
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "text/plain" }, body });
    const reply = (await response.json()) as { ok?: boolean };
    return reply.ok === true;
  } catch {
    return sendByFrame(endpoint, body);
  }
}
