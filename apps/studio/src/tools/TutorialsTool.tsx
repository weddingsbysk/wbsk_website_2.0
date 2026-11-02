import { useRef, useState, type CSSProperties } from "react";
import film from "../tutorials/using-wbsk-studio.json";
import posterUrl from "../tutorials/using-wbsk-studio.jpg?url";
import { SITE_ADDRESS } from "../brand";

// On the website's hosting, because the Studio's can't jump inside a video: Safari refuses it, and chapters do nothing.
const filmUrl = `${SITE_ADDRESS}/tutorial/using-wbsk-studio.mp4`;

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/** The tutorial film, with chapters to jump between. It only plays, and only has sound, when pressed. */
export function TutorialsTool() {
  const video = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const [failed, setFailed] = useState(false);
  const current = film.chapters.reduce((found, chapter, index) => (time + 0.2 >= chapter.at ? index : found), 0);

  const jump = (at: number) => {
    const player = video.current;
    if (!player) return;
    player.currentTime = at;
    setTime(at);
    void player.play().catch(() => undefined);
  };

  return (
    <div className="st-page">
      <div className="st-page__inner">
        <h1 className="st-title st-rise">Tutorials</h1>
        <p className="st-lede st-rise">The whole Studio in two and a half minutes. Press play, and turn the sound up.</p>
        <div className="st-film st-rise" style={{ "--i": 1 } as CSSProperties}>
          <div className="st-film__screen">
            {failed ? (
              <p className="st-film__error" role="status">
                The film didn&rsquo;t load. Refresh the page, or read the steps in the Guide instead.
              </p>
            ) : (
              <video ref={video} src={filmUrl} poster={posterUrl} controls playsInline preload="metadata" aria-label="How to use WBSK Studio, a short film" onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)} onError={() => setFailed(true)} />
            )}
          </div>
          <nav className="st-film__chapters" aria-label="Chapters">
            {film.chapters.map((chapter, index) => (
              <button key={chapter.title} type="button" aria-current={index === current ? "true" : undefined} onClick={() => jump(chapter.at)}>
                <span>{chapter.title}</span>
                <small>{clock(chapter.at)}</small>
              </button>
            ))}
          </nav>
        </div>
        <details className="st-film__words st-rise" style={{ "--i": 2 } as CSSProperties}>
          <summary>Read the film&rsquo;s words instead</summary>
          <ol>
            {film.captions.map((line) => (
              <li key={line.start}>{line.text}</li>
            ))}
          </ol>
        </details>
      </div>
    </div>
  );
}
