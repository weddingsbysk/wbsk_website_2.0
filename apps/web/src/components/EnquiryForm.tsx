"use client";

import "@wbsk/ui/css/forms.css";
import { fillThankYou, shownQuestions, validateForm, type FormConfig, type FormValues } from "@wbsk/content";
import { ArrowIcon, WbskLink } from "@wbsk/ui";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { clockNow, loadFormsBundle, newSubmissionId, sendForm } from "../lib/submit";
import { EnquiryChat } from "./EnquiryChat";

type State = "typing" | "sending" | "sent" | "failed";

/** What a visitor has typed stays until it's sent or they leave the site (Decisions 03 and 16). */
const drafts = new Map<string, { values: FormValues; consented: boolean }>();

const inputType = { email: "email", phone: "tel", url: "text" } as Record<string, string>;
const autoComplete = { name: "name", names: "name", email: "email", phone: "tel" } as Record<string, string>;

/** Couples get the conversation; job applications stay a form, where everything is seen at once. */
export function EnquiryForm({ config, roles }: { config: FormConfig; roles?: string[] }) {
  return config.kind === "careers" ? <PlainForm config={config} roles={roles} /> : <EnquiryChat config={config} />;
}

/** One form, configured from the Studio (Decisions 14 and 15). */
function PlainForm({ config, roles }: { config: FormConfig; roles?: string[] }) {
  const base = useId();
  const startedAt = useRef(0);
  const draft = drafts.get(config.kind);
  const [values, setValues] = useState<FormValues>(draft?.values ?? {});
  const [consented, setConsented] = useState(draft?.consented ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<State>("typing");
  const [backup, setBackup] = useState<{ whatsApp: string | null; email: string | null }>({ whatsApp: null, email: null });
  const formRef = useRef<HTMLFormElement>(null);
  const trapRef = useRef<HTMLInputElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const questions = shownQuestions(config.questions);
  const consentMatch = config.consent.match(/^(.*?)(privacy policy)(.*)$/is);
  const consentBefore = consentMatch ? consentMatch[1] : `${config.consent} `;
  const consentLink = consentMatch ? consentMatch[2] : "Privacy policy";
  const consentAfter = consentMatch ? consentMatch[3] : "";

  useEffect(() => {
    startedAt.current = clockNow();
  }, []);

  const remember = (nextValues: FormValues, nextConsent: boolean) =>
    drafts.set(config.kind, { values: nextValues, consented: nextConsent });

  const setValue = (key: string, value: string | string[]) => {
    const next = { ...values, [key]: value };
    setValues(next);
    remember(next, consented);
    // A note clears as soon as the field is fixed (Decision 16).
    if (errors[key] || (key === "email" && errors.phone)) {
      const stillWrong = validateForm(config, next, consented);
      setErrors((current) => {
        const updated = { ...current };
        for (const name of [key, "phone", "email"]) if (!stillWrong[name]) delete updated[name];
        return updated;
      });
    }
  };

  // The thank-you or failure message takes the focus, once it's on the page (Decision 16).
  useEffect(() => {
    if (state === "sent" || state === "failed") noticeRef.current?.focus();
  }, [state]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (state === "sending") return;
    const found = validateForm(config, values, consented);
    setErrors(found);
    const firstProblem = [...questions.map((q) => q.key), "consent"].find((key) => found[key]);
    if (firstProblem) {
      formRef.current?.querySelector<HTMLElement>(`[data-field="${firstProblem}"] input, [data-field="${firstProblem}"] textarea`)?.focus();
      return;
    }
    setState("sending");
    const ok = await sendForm({
      id: newSubmissionId(),
      form: config.kind,
      values,
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

  if (state === "sent") {
    const hasEmail = String(values.email ?? "").trim().length > 0;
    // With no email there's no copy on its way, so that sentence is dropped (G4).
    const text = hasEmail ? config.thankYouText : config.thankYouText.replace(/\s*A copy of your details[^.]*\./, "");
    return (
      <div ref={noticeRef} className="wbsk-form__done" tabIndex={-1} role="status" data-form-state="sent">
        <h2 className="wbsk-h2">{fillThankYou(config.thankYouHeading, values)}</h2>
        <p className="wbsk-lead wbsk-measure">{text}</p>
        <button
          type="button"
          className="wbsk-link wbsk-form__again"
          onClick={() => {
            setValues({});
            setConsented(false);
            setErrors({});
            startedAt.current = clockNow();
            setState("typing");
          }}
        >
          {config.kind === "careers" ? "Send another application" : "Send another enquiry"}
        </button>
      </div>
    );
  }

  const hasErrors = Object.keys(errors).length > 0;
  return (
    <div className="wbsk-form">
      <form ref={formRef} className="wbsk-form__main" onSubmit={submit} noValidate>
        <h2 className="wbsk-h2 wbsk-form__heading">{config.heading}</h2>
        <div className="wbsk-form__fields">
          {questions.map((question) => {
            const id = `${base}-${question.key}`;
            const error = errors[question.key];
            const describedBy = error ? `${id}-error` : undefined;
            const wide = ["many", "long"].includes(question.kind) || (question.choices?.length ?? 0) > 3;
            const choices = question.kind === "role" ? (roles ?? question.choices ?? []) : question.choices;
            if (question.kind === "one" || question.kind === "many" || question.kind === "role") {
              const chosen = values[question.key];
              const multiple = question.kind === "many";
              return (
                <fieldset key={question.key} className="wbsk-field wbsk-field--choices" data-field={question.key} data-wide={wide || undefined} data-error={error ? true : undefined} aria-describedby={describedBy}>
                  <legend className="wbsk-field__label">
                    {question.label}
                    {question.required ? <span className="wbsk-sr"> (required)</span> : null}
                  </legend>
                  <div className="wbsk-choices">
                    {(choices ?? []).map((choice) => {
                      const on = multiple ? (Array.isArray(chosen) && chosen.includes(choice)) : chosen === choice;
                      return (
                        <label key={choice} className="wbsk-choice" data-on={on || undefined}>
                          <input
                            type={multiple ? "checkbox" : "radio"}
                            name={id}
                            checked={on}
                            onChange={() => {
                              if (!multiple) return setValue(question.key, choice);
                              const list = Array.isArray(chosen) ? chosen : [];
                              setValue(question.key, on ? list.filter((item) => item !== choice) : [...list, choice]);
                            }}
                          />
                          <span>{choice}</span>
                        </label>
                      );
                    })}
                  </div>
                  {error ? <p id={`${id}-error`} className="wbsk-field__error">{error}</p> : null}
                </fieldset>
              );
            }
            const shared = {
              id,
              value: String(values[question.key] ?? ""),
              placeholder: question.example,
              "aria-invalid": error ? true : undefined,
              "aria-describedby": describedBy,
              "aria-required": question.required || undefined,
            };
            return (
              <div key={question.key} className="wbsk-field" data-field={question.key} data-wide={wide || undefined} data-error={error ? true : undefined}>
                <label className="wbsk-field__label" htmlFor={id}>
                  {question.label}
                </label>
                {question.kind === "long" ? (
                  <textarea {...shared} rows={3} onChange={(event) => setValue(question.key, event.target.value)} />
                ) : (
                  <input
                    {...shared}
                    type={inputType[question.kind] ?? "text"}
                    inputMode={question.kind === "phone" ? "tel" : question.kind === "url" ? "url" : undefined}
                    autoComplete={autoComplete[question.key]}
                    onChange={(event) => setValue(question.key, event.target.value)}
                  />
                )}
                {error ? <p id={`${id}-error`} className="wbsk-field__error">{error}</p> : null}
              </div>
            );
          })}
        </div>

        {/* A trap for bots; people never see it, and it's skipped by keyboard and screen readers. */}
        <div className="wbsk-form__trap" aria-hidden="true">
          <label>
            Website
            <input ref={trapRef} type="text" tabIndex={-1} autoComplete="off" name="website" />
          </label>
        </div>

        <div className="wbsk-consent" data-field="consent" data-error={errors.consent ? true : undefined}>
          <label>
            <input
              type="checkbox"
              checked={consented}
              aria-describedby={errors.consent ? `${base}-consent-error` : undefined}
              onChange={(event) => {
                setConsented(event.target.checked);
                remember(values, event.target.checked);
                if (event.target.checked) setErrors(({ consent: _consent, ...rest }) => rest);
              }}
            />
            <span>
              {/* The link sits on the words already in the sentence, so it's never said twice. */}
              {consentBefore}
              <WbskLink href="/privacy/" className="wbsk-consent__link">
                {consentLink}
              </WbskLink>
              {consentAfter}
            </span>
          </label>
          {errors.consent ? <p id={`${base}-consent-error`} className="wbsk-field__error">{errors.consent}</p> : null}
        </div>

        {hasErrors ? (
          <p className="wbsk-form__summary" role="alert">
            A few details need a look before we can send this.
          </p>
        ) : null}

        {state === "failed" ? (
          <div ref={noticeRef} className="wbsk-form__failed" tabIndex={-1} role="alert" data-form-state="failed">
            <p className="wbsk-form__failedhead">Something went wrong on our side.</p>
            <p>Your details are still here. Please try again, or reach us directly:</p>
            {backup.whatsApp ? <p className="wbsk-form__contact">WhatsApp: {backup.whatsApp}</p> : null}
            {backup.email ? <p className="wbsk-form__contact">Email: {backup.email}</p> : null}
          </div>
        ) : null}

        <button type="submit" className="wbsk-button wbsk-form__send" disabled={state === "sending"} aria-busy={state === "sending"}>
          <span>{state === "sending" ? "Sending…" : state === "failed" ? "Try again" : config.button.replace(/\s*→\s*$/, "")}</span>
          {state === "sending" ? null : <ArrowIcon />}
        </button>
      </form>
      <aside className="wbsk-form__next" aria-label="What happens next">
        <p className="wbsk-label">What happens next</p>
        <ol>
          {config.nextSteps.map((step, index) => (
            <li key={step}>
              <span className="wbsk-form__stepno" aria-hidden="true">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
