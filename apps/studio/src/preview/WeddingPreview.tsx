import { sanityProject, shownQuestions, type FormQuestion } from "@wbsk/content";
import { CoupleNames, Gallery, Header, LinkProvider, StoryCover, type SanityImage, type WbskImageSource, type WbskLinkProps } from "@wbsk/ui";
import { navItems } from "@wbsk/content";
import logoUrl from "../../../web/public/wbsk-logo.svg";

const PREVIEW_PHOTOS = 20;

type DraftImage = { asset?: { _ref?: string }; description?: string; hotspot?: { x: number; y: number } } | undefined;
export type DraftDocument = Record<string, unknown>;

export function draftImage(value: DraftImage): WbskImageSource | null {
  const match = value?.asset?._ref?.match(/^image-([^-]+)-(\d+)x(\d+)-([a-z0-9]+)$/);
  if (!match) return null;
  const [, id, width, height, format] = match;
  return {
    kind: "sanity",
    url: `https://cdn.sanity.io/images/${sanityProject.projectId}/${sanityProject.dataset}/${id}-${width}x${height}.${format}`,
    width: Number(width),
    height: Number(height),
    alt: value?.description ?? "",
    focal: value?.hotspot ? { x: value.hotspot.x, y: value.hotspot.y } : undefined,
  };
}

// Links in a preview don't go anywhere: it's only for checking the draft.
const renderLink = ({ href: _href, onClick: _onClick, ...rest }: WbskLinkProps) => (
  <a href="#preview" onClick={(event) => event.preventDefault()} {...rest} />
);

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <LinkProvider value={renderLink}>
      <Header items={navItems} enquireHref="/#enquire" homeHref="/" logoSrc={logoUrl} currentPath="/client/" />
      <main>{children}</main>
    </LinkProvider>
  );
}

function WeddingBody({ doc }: { doc: DraftDocument }) {
  const first = (doc.firstName as string) || "First name";
  const second = (doc.secondName as string) || "Second name";
  const gallery = ((doc.gallery as DraftImage[]) ?? []).map(draftImage).filter((image): image is SanityImage => image?.kind === "sanity");
  const posters = ["teaser", "highlight"].map((key) => draftImage((doc[key] as { poster?: DraftImage } | undefined)?.poster)).filter(Boolean);
  return (
    <>
      <StoryCover
        cover={draftImage(doc.coverDesktop as DraftImage)}
        coverPhone={draftImage(doc.coverPhone as DraftImage)}
        place={[doc.placeLabel, doc.city].filter(Boolean).join(" · ").toUpperCase() || "PLACE"}
        names={<CoupleNames first={first} second={second} />}
        meta={[doc.venue, doc.weddingDate].filter(Boolean).join(" · ")}
      />
      <div className="wbsk-container wbsk-story">
        <p className="wbsk-lead wbsk-measure">{(doc.theirStory as string) || "Their story appears here as you type."}</p>
      </div>
      {gallery.length ? (
        <div className="wbsk-container">
          <Gallery photos={gallery} limit={PREVIEW_PHOTOS} />
        </div>
      ) : null}
      {posters.length ? (
        <div data-tone="dark" className="wbsk-section">
          <div className="wbsk-container wbsk-cinema">
            {posters.map((poster) =>
              poster?.kind === "sanity" ? <img key={poster.url} src={`${poster.url}?w=1200&auto=format`} alt="" style={{ width: "100%", borderRadius: 8 }} /> : null,
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function DestinationBody({ doc }: { doc: DraftDocument }) {
  return (
    <StoryCover
      cover={draftImage(doc.coverDesktop as DraftImage)}
      coverPhone={draftImage(doc.coverPhone as DraftImage)}
      place="PRE-WEDDING"
      names={(doc.name as string) || "Destination"}
      meta=""
    />
  );
}

function CoverBody({ doc, line, desktop, phone, credit }: { doc: DraftDocument; line: string; desktop: string; phone: string; credit?: string }) {
  const poster = draftImage(doc[desktop] as DraftImage);
  const portrait = draftImage(doc[phone] as DraftImage);
  const shown = window.matchMedia("(orientation: portrait)").matches ? (portrait ?? poster) : poster;
  return (
    <section data-tone="dark" className="wbsk-hero" style={{ background: "#1F1914" }}>
      {shown?.kind === "sanity" ? (
        <img src={`${shown.url}?w=1600&auto=format`} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      ) : null}
      <div className="wbsk-hero__text wbsk-container">
        <p className="wbsk-display" style={{ color: "#F5EFE6" }}>{line}</p>
        {credit ? <p style={{ color: "#F5EFE6" }}>{credit}</p> : null}
      </div>
    </section>
  );
}

function HomepageBody({ doc }: { doc: DraftDocument }) {
  return (
    <>
      <CoverBody doc={doc} line={(doc.heroLine as string) || "Hero line"} desktop="heroPosterDesktop" phone="heroPosterPhone" />
      {doc.whoWeAre ? (
        <section className="wbsk-section wbsk-container">
          <p className="wbsk-label">Who we are</p>
          <p className="wbsk-h1" style={{ marginTop: 20 }}>{doc.whoWeAre as string}</p>
        </section>
      ) : null}
    </>
  );
}

/** The form re-flows as questions are shown, hidden or reordered (Decisions 14 and 22). */
function FormBody({ doc }: { doc: DraftDocument }) {
  const questions = shownQuestions((doc.questions as FormQuestion[]) ?? []);
  const steps = (doc.nextSteps as string[]) ?? [];
  return (
    <section className="wbsk-section wbsk-container" style={{ paddingBlock: 96 }}>
      <div className="wbsk-form">
        <div>
          <p className="wbsk-h2 wbsk-form__heading">{(doc.heading as string) || "Heading"}</p>
          <div className="wbsk-form__fields">
            {questions.map((question) => {
              const wide = ["many", "long"].includes(question.kind) || (question.choices?.length ?? 0) > 3;
              const choices = question.kind === "role" ? ["Open roles appear here"] : question.choices;
              return (
                <div key={question.key} className="wbsk-field" data-wide={wide || undefined}>
                  <span className="wbsk-field__label">{question.label}</span>
                  {choices ? (
                    <div className="wbsk-choices">
                      {choices.map((choice) => (
                        <span key={choice} className="wbsk-choice"><span>{choice}</span></span>
                      ))}
                    </div>
                  ) : (
                    <input readOnly tabIndex={-1} placeholder={question.example} aria-label={question.label} />
                  )}
                </div>
              );
            })}
          </div>
          <p className="wbsk-consent">{doc.consent as string}</p>
          <span className="wbsk-button wbsk-form__send"><span>{((doc.button as string) || "Send").replace(/\s*→\s*$/, "")} →</span></span>
        </div>
        <div className="wbsk-form__next">
          <p className="wbsk-label">What happens next</p>
          <ol>
            {steps.map((step, index) => (
              <li key={step}><span className="wbsk-form__stepno">{index + 1}</span><span>{step}</span></li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/** The real components, drawn from the draft. Only you can see it (Decision 22). */
export function WeddingPreview({ doc }: { doc: DraftDocument; phone: boolean }) {
  const type = doc._type as string;
  return (
    <Shell>
      {type === "destination" ? <DestinationBody doc={doc} /> : null}
      {type === "homepage" ? <HomepageBody doc={doc} /> : null}
      {type === "preWeddingPage" ? (
        <CoverBody doc={doc} line="Pre-wedding" desktop="coverPosterDesktop" phone="coverPosterPhone" credit={doc.credit as string} />
      ) : null}
      {type === "enquiryForm" ? <FormBody doc={doc} /> : null}
      {type === "wedding" ? <WeddingBody doc={doc} /> : null}
    </Shell>
  );
}
