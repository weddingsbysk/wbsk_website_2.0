"use client";

import "@wbsk/ui/css/forms.css";
import { answerProblem, askFor, canSkip, chatSteps, fillThankYou, replyFor, type FormConfig, type FormValues } from "@wbsk/content";
import { ArrowIcon, WbskLink } from "@wbsk/ui";
import { prefersReducedMotion } from "@wbsk/ui/motion";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { clockNow, loadFormsBundle, newSubmissionId, sendForm } from "../lib/submit";

type State = "talking" | "sending" | "sent" | "failed";
type Draft = { values: FormValues; reached: number };

/** The conversation stays until it's sent or they leave the site (Decisions 03 and 16). */
const drafts = new Map<string, Draft>();

const THINK_MS = 560;
const inputType = { email: "email", phone: "tel" } as Record<string, string>;
const autoComplete = { names: "name", email: "email", phone: "tel" } as Record<string, string>;

const shownAnswer = (value: FormValues[string] | undefined) => (Array.isArray(value) ? value.join(", ") : (value ?? "")).trim();

function Bot({ children }: { children: ReactNode }) {
  return (
    <div className="wbsk-chat__row">
      <span className="wbsk-chat__seal" aria-hidden="true">W</span>
      <div className="wbsk-chat__bubble">{children}</div>
    </div>
  );
}

/**
 * The wedding and pre-wedding enquiry as a conversation: one question at a time, from the same
 * Studio settings and sent the same way as the form it replaced (owner, 4 November 2026). It follows
 * a set script; nothing typed here goes to any outside service until it's sent to the Sheet.
 */
export function EnquiryChat({ config }: { config: FormConfig }) {
  const base = useId();
  const steps = useMemo(() => chatSteps(config), [config]);
  const draft = drafts.get(config.kind);
  const [values, setValues] = useState<FormValues>(draft?.values ?? {});
  // How far the conversation has got; steps.length means every question has been answered.
  const [reached, setReached] = useState(draft?.reached ?? 0);
  // The question being changed, if they've gone back to one.
  const [changing, setChanging] = useState<number | null>(null);
  const [thinking, setThinking] = useState(false);
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [state, setState] = useState<State>("talking");
  const [backup, setBackup] = useState<{ whatsApp: string | null; email: string | null }>({ whatsApp: null, email: null });
  const startedAt = useRef(0);
  const touched = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const trapRef = useRef<HTMLInputElement>(null);
  const timer = useRef(0);

  const at = changing ?? reached;
  const step = steps[at];
  const finished = reached >= steps.length;
  const consentMatch = config.consent.match(/^(.*?)(privacy policy)(.*)$/is);

  useEffect(() => {
    startedAt.current = clockNow();
    return () => window.clearTimeout(timer.current);
  }, []);

  // New messages scroll the conversation's own window, never the page.
  useLayoutEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [reached, thinking, changing, state, problem]);

  // The cursor follows the conversation once they've joined it, and never before.
  useEffect(() => {
    if (!touched.current || thinking) return;
    if (state === "sent" || state === "failed") noticeRef.current?.focus({ preventScroll: true });
    else composerRef.current?.querySelector<HTMLElement>("input:not([tabindex='-1']), textarea, button")?.focus({ preventScroll: true });
  }, [at, thinking, state]);

  const send = async (answers: FormValues) => {
    setState("sending");
    const ok = await sendForm({
      id: newSubmissionId(),
      form: config.kind,
      values: answers,
      consent: true,
      openedFrom: window.location.pathname,
      elapsedMs: clockNow() - startedAt.current,
      website: trapRef.current?.value ?? "",
    }).catch(() => false);
    if (ok) {
      drafts.delete(config.kind);
      setState("sent");
    } else {
      const contact = await loadFormsBundle().catch(() => null);
      setBackup({ whatsApp: contact?.backupWhatsApp ?? null, email: contact?.backupEmail ?? null });
      setState("failed");
    }
  };

  /** Takes an answer, checks it, and moves the conversation on. */
  const answer = (value: string | string[]) => {
    if (!step) return;
    touched.current = true;
    const next = { ...values, [step.key]: value };
    const emailStillToCome = steps.slice(at + 1).some((later) => later.key === "email");
    const wrong = answerProblem(config, step, next, emailStillToCome);
    if (wrong) {
      setProblem(wrong);
      return;
    }
    setProblem(null);
    setValues(next);
    setText("");
    setPicked([]);
    const nextReached = changing === null ? reached + 1 : reached;
    drafts.set(config.kind, { values: next, reached: nextReached });
    setChanging(null);
    setReached(nextReached);
    if (prefersReducedMotion()) return;
    setThinking(true);
    timer.current = window.setTimeout(() => setThinking(false), THINK_MS);
  };

  const changeAnswer = (index: number) => {
    touched.current = true;
    const value = values[steps[index]!.key];
    setChanging(index);
    setProblem(null);
    setPicked(Array.isArray(value) ? value : []);
    setText(Array.isArray(value) ? "" : (value ?? ""));
  };

  const submitText = (event: FormEvent) => {
    event.preventDefault();
    answer(text.trim());
  };

  const startAgain = () => {
    touched.current = true;
    setValues({});
    setReached(0);
    setChanging(null);
    setText("");
    setPicked([]);
    setProblem(null);
    startedAt.current = clockNow();
    setState("talking");
  };

  const hasEmail = shownAnswer(values.email).length > 0;
  const progress = state === "sent" ? 1 : Math.min(1, reached / Math.max(1, steps.length));
  const errorId = `${base}-problem`;
  const skip = step && canSkip(step, values) && changing === null;

  return (
    <div className="wbsk-form wbsk-chatform">
      <div className="wbsk-chat" data-field-chat>
        <div className="wbsk-chat__head">
          <span className="wbsk-chat__seal" aria-hidden="true">W</span>
          <div>
            <h2 className="wbsk-chat__title">{config.heading}</h2>
            <p className="wbsk-chat__sub">A few quick questions. We reply within a day.</p>
          </div>
          <span className="wbsk-chat__progress" aria-hidden="true">
            <span style={{ transform: `scaleX(${progress})` }} />
          </span>
        </div>

        <div ref={logRef} className="wbsk-chat__log" role="log" aria-label="Your conversation with WBSK" tabIndex={0} data-native-wheel>
          {steps.slice(0, reached + 1).map((item, index) => {
            const isCurrent = index === reached;
            if (isCurrent && thinking) return null;
            const said = shownAnswer(values[item.key]);
            const earlier = index > 0 ? replyFor(steps[index - 1]!, values) : null;
            return (
              <div key={item.key} className="wbsk-chat__turn">
                <Bot>
                  {index === 0 ? <p>Hello, and welcome to Weddings By Siddhant Kapoor.</p> : null}
                  {earlier ? <p>{earlier}</p> : null}
                  <p>{askFor(item, values)}</p>
                </Bot>
                {index < reached ? (
                  <div className="wbsk-chat__row wbsk-chat__row--them">
                    <div className="wbsk-chat__bubble" data-skipped={said ? undefined : true}>
                      {said || "Skipped"}
                    </div>
                    <button type="button" className="wbsk-chat__change" onClick={() => changeAnswer(index)} disabled={state === "sending"}>
                      Change<span className="wbsk-sr"> your answer to: {item.label}</span>
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}

          {finished && !thinking && state !== "sent" ? (
            <Bot>
              {replyFor(steps[steps.length - 1]!, values) ? <p>{replyFor(steps[steps.length - 1]!, values)}</p> : null}
              <p>
                {/* The link sits on the words already in the sentence, so it's never said twice. */}
                {consentMatch ? consentMatch[1] : `${config.consent} `}
                <WbskLink href="/privacy/" className="wbsk-consent__link">
                  {consentMatch ? consentMatch[2] : "Privacy policy"}
                </WbskLink>
                {consentMatch ? consentMatch[3] : ""}
              </p>
            </Bot>
          ) : null}

          {thinking ? (
            <div className="wbsk-chat__row" aria-hidden="true">
              <span className="wbsk-chat__seal">W</span>
              <div className="wbsk-chat__bubble wbsk-chat__dots">
                <span />
                <span />
                <span />
              </div>
            </div>
          ) : null}

          {state === "failed" ? (
            <div ref={noticeRef} tabIndex={-1} role="alert" data-form-state="failed" className="wbsk-chat__notice">
              <Bot>
                <p>
                  <strong>Something went wrong on our side.</strong>
                </p>
                <p>Your answers are still here. Please try again, or reach us directly:</p>
                {backup.whatsApp ? <p className="wbsk-form__contact">WhatsApp: {backup.whatsApp}</p> : null}
                {backup.email ? <p className="wbsk-form__contact">Email: {backup.email}</p> : null}
              </Bot>
            </div>
          ) : null}

          {state === "sent" ? (
            <div ref={noticeRef} tabIndex={-1} role="status" data-form-state="sent" className="wbsk-chat__notice">
              <Bot>
                <p>
                  <strong>{fillThankYou(config.thankYouHeading, values)}</strong>
                </p>
                {/* With no email there's no copy on its way, so that sentence is dropped (G4). */}
                <p>{hasEmail ? config.thankYouText : config.thankYouText.replace(/\s*A copy of your details[^.]*\./, "")}</p>
              </Bot>
            </div>
          ) : null}
        </div>

        <div ref={composerRef} className="wbsk-chat__composer" data-field={step?.key}>
          {/* A trap for bots; people never see it, and it's skipped by keyboard and screen readers. */}
          <div className="wbsk-form__trap" aria-hidden="true">
            <label>
              Website
              <input ref={trapRef} type="text" tabIndex={-1} autoComplete="off" name="website" />
            </label>
          </div>

          {state === "sent" ? (
            <button type="button" className="wbsk-link wbsk-form__again" onClick={startAgain}>
              Send another enquiry
            </button>
          ) : null}

          {thinking || state === "sent" ? null : finished && changing === null ? (
            <button
              type="button"
              className="wbsk-button wbsk-form__send"
              disabled={state === "sending"}
              aria-busy={state === "sending"}
              onClick={() => {
                touched.current = true;
                void send(values);
              }}
            >
              <span>{state === "sending" ? "Sending…" : state === "failed" ? "Try again" : `I agree. ${config.button.replace(/\s*→\s*$/, "")}`}</span>
              {state === "sending" ? null : <ArrowIcon />}
            </button>
          ) : step ? (
            <>
              {changing !== null ? (
                <p className="wbsk-chat__changing">
                  <span>Changing: {step.label}</span>
                  <button
                    type="button"
                    className="wbsk-chat__change"
                    onClick={() => {
                      setChanging(null);
                      setText("");
                      setPicked([]);
                      setProblem(null);
                    }}
                  >
                    Cancel
                  </button>
                </p>
              ) : null}
              {step.kind === "one" || step.kind === "many" ? (
                <div className="wbsk-chat__choices" role="group" aria-label={askFor(step, values)}>
                  {(step.choices ?? []).map((choice) => {
                    const on = picked.includes(choice);
                    return step.kind === "many" ? (
                      <button
                        key={choice}
                        type="button"
                        className="wbsk-chat__chip"
                        aria-pressed={on}
                        data-on={on || undefined}
                        onClick={() => setPicked(on ? picked.filter((item) => item !== choice) : [...picked, choice])}
                      >
                        {choice}
                      </button>
                    ) : (
                      <button key={choice} type="button" className="wbsk-chat__chip" onClick={() => answer(choice)}>
                        {choice}
                      </button>
                    );
                  })}
                  {step.kind === "many" ? (
                    <button type="button" className="wbsk-chat__done" disabled={picked.length === 0} onClick={() => answer(picked)}>
                      Done
                    </button>
                  ) : null}
                </div>
              ) : (
                <form className="wbsk-chat__type" onSubmit={submitText} noValidate>
                  <label className="wbsk-sr" htmlFor={`${base}-answer`}>
                    {askFor(step, values)}
                  </label>
                  {step.kind === "long" ? (
                    <textarea
                      id={`${base}-answer`}
                      rows={2}
                      value={text}
                      placeholder="Type your answer"
                      aria-describedby={problem ? errorId : undefined}
                      onChange={(event) => setText(event.target.value)}
                      onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          answer(text.trim());
                        }
                      }}
                    />
                  ) : (
                    <input
                      id={`${base}-answer`}
                      type={inputType[step.kind] ?? "text"}
                      inputMode={step.kind === "phone" ? "tel" : undefined}
                      autoComplete={autoComplete[step.key] ?? "off"}
                      value={text}
                      placeholder={step.example || "Type your answer"}
                      aria-invalid={problem ? true : undefined}
                      aria-describedby={problem ? errorId : undefined}
                      onChange={(event) => {
                        setText(event.target.value);
                        setProblem(null);
                      }}
                    />
                  )}
                  <button type="submit" className="wbsk-chat__send" aria-label="Send this answer">
                    <ArrowIcon />
                  </button>
                </form>
              )}
              {problem ? (
                <p id={errorId} className="wbsk-field__error" role="alert">
                  {problem}
                </p>
              ) : null}
              {skip ? (
                <button type="button" className="wbsk-chat__skip" onClick={() => answer(step.kind === "many" ? [] : "")}>
                  Skip this one
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <aside className="wbsk-form__next" aria-label="What happens next">
        <p className="wbsk-label">What happens next</p>
        <ol>
          {config.nextSteps.map((item, index) => (
            <li key={item}>
              <span className="wbsk-form__stepno" aria-hidden="true">{index + 1}</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
