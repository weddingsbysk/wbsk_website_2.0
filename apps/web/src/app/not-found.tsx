import { WbskLink } from "@wbsk/ui";

export default function NotFound() {
  return (
    <section className="wbsk-section wbsk-pageintro">
      <div className="wbsk-container">
        <h1 className="wbsk-h1">This page isn&rsquo;t here</h1>
        <p className="wbsk-lead wbsk-pageintro__text wbsk-measure">
          The address may have changed. The weddings page has every story.
        </p>
        <p className="mt-10">
          <WbskLink href="/weddings/" className="wbsk-button">
            <span>Go to weddings</span>
          </WbskLink>
        </p>
      </div>
    </section>
  );
}
