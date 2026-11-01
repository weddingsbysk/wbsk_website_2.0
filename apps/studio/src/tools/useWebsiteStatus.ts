import { useEffect, useState } from "react";

const RUNS = "https://api.github.com/repos/weddingsbysk/wbsk_website_2.0/actions/workflows/deploy.yml/runs?per_page=5";
const CHECK_MS = 60000;

export type WebsiteStatus = {
  state: "unknown" | "live" | "updating" | "failed";
  /** When the last good update started. Anything published before this is on the website. */
  liveSince?: string;
};

type Run = { status: string; conclusion: string | null; created_at: string };

export function readStatus(runs: Run[]): WebsiteStatus {
  if (!runs.length) return { state: "unknown" };
  const liveSince = runs.find((run) => run.conclusion === "success")?.created_at;
  const latest = runs[0]!;
  if (latest.status !== "completed") return { state: "updating", liveSince };
  // A run replaced by a newer one isn't a failure.
  if (latest.conclusion === "failure") return { state: "failed", liveSince };
  return { state: "live", liveSince };
}

let shared: Promise<WebsiteStatus> | null = null;
let sharedAt = 0;

/** GitHub's public address needs no token, and allows plenty of checks at one a minute. */
function fetchStatus() {
  if (!shared || Date.now() - sharedAt > CHECK_MS / 2) {
    sharedAt = Date.now();
    shared = fetch(RUNS)
      .then((response) => (response.ok ? response.json() : { workflow_runs: [] }))
      .then((body: { workflow_runs?: Run[] }) => readStatus(body.workflow_runs ?? []))
      .catch(() => ({ state: "unknown" as const }));
  }
  return shared;
}

export function useWebsiteStatus() {
  const [status, setStatus] = useState<WebsiteStatus>({ state: "unknown" });
  useEffect(() => {
    let live = true;
    const read = () => void fetchStatus().then((next) => live && setStatus(next));
    read();
    const timer = window.setInterval(read, CHECK_MS);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, []);
  return status;
}

export function minutesAgo(iso?: string) {
  if (!iso) return "";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours} hr ago` : `${Math.round(hours / 24)} days ago`;
}
