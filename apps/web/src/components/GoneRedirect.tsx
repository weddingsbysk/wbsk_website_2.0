import { publicAsset } from "../lib/site";

/**
 * GitHub Pages can't send a permanent redirect, so a removed page leads on by itself, marked not to
 * be indexed (Decision 20).
 */
export function GoneRedirect({ to, label }: { to: string; label: string }) {
  const href = publicAsset(to);
  return (
    <section className="wbsk-container wbsk-pagehead">
      <meta httpEquiv="refresh" content={`0;url=${href}`} />
      <h1 className="wbsk-h2">This page has moved.</h1>
      <p>
        <a className="wbsk-link" href={href}>
          Go to {label}
        </a>
      </p>
    </section>
  );
}
