import shapes from "./intro-logo-shapes.json";

/** Extra room around each word, so the edge of a letter is never cut. Master pixels. */
export const INTRO_WORD_PAD = 2;
const HEIGHT = 200;
/** Where the closed-up WBSK sits in the master band, with the margin the header logo was matched to. */
const MARK_BOX = "1088 45 464 108";

/**
 * The closing logo as vector outlines, traced from the owner's lossless 4K master by
 * scripts/build-intro-vectors.mjs, so it's sharp at any size on any screen. Rendered on the server: the
 * shapes reach the page as markup and add nothing to its scripts.
 */
export function IntroName() {
  return shapes.map((word) => (
    <div key={word.name} className="wbsk-intro__word" data-gold={word.gold || undefined}>
      <svg viewBox={`${-INTRO_WORD_PAD} 0 ${word.width + INTRO_WORD_PAD * 2} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
        <path d={word.path} fillRule="evenodd" />
      </svg>
    </div>
  ));
}

/** The closed WBSK alone: the same outlines, for the moment there's no motion to play. */
export function IntroMark() {
  return (
    <svg viewBox={MARK_BOX} aria-hidden="true">
      {shapes.map((word) => {
        const clip = `intro-mark-${word.name}`;
        return (
          <g key={word.name} fill={word.gold ? "#DDAF3A" : "#FCFCFC"} transform={`translate(${word.closedX} 0)`}>
            <clipPath id={clip}>
              <rect x={-1} y={0} width={word.initial + 1} height={HEIGHT} />
            </clipPath>
            <path d={word.path} fillRule="evenodd" clipPath={`url(#${clip})`} />
          </g>
        );
      })}
    </svg>
  );
}
