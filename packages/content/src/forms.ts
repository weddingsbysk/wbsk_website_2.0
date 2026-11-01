export type QuestionKind = "text" | "one" | "many" | "long" | "phone" | "email" | "url" | "role";

export type FormQuestion = {
  key: string;
  label: string;
  kind: QuestionKind;
  example?: string;
  locked?: boolean;
  shown?: boolean;
  required?: boolean;
  choices?: string[];
};

export type FormKind = "wedding" | "preWedding" | "careers";

export type FormConfig = {
  kind: FormKind;
  heading: string;
  button: string;
  questions: FormQuestion[];
  nextSteps: string[];
  thankYouHeading: string;
  thankYouText: string;
  consent: string;
};

export type FormValues = Record<string, string | string[]>;

/** A question shows unless the Studio hid it; locked ones can't be hidden (Decision 14). */
export const shownQuestions = (questions: FormQuestion[]) =>
  questions.filter((question) => question.locked || question.shown !== false);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_DIGITS = 7;

/** Friendly notes for each field (Decision 16), keyed by the question they belong to. */
const MISSING: Record<string, string> = {
  names: "Add your names.",
  name: "Add your name.",
  date: "Add a date. A month is enough.",
  place: "Add a place.",
  role: "Choose the role you're applying for.",
  experience: "Choose your years of experience.",
  portfolio: "Add a link to your work.",
  phone: "Add a phone number.",
  email: "Add your email.",
};

const asText = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value.join(", ") : (value ?? "")).trim();

/** Checks a form the way the handler checks it again on arrival (Decision 14). */
export function validateForm(config: FormConfig, values: FormValues, consented: boolean) {
  const errors: Record<string, string> = {};
  const questions = shownQuestions(config.questions);
  for (const question of questions) {
    const value = asText(values[question.key]);
    if (!value) {
      if (question.required) errors[question.key] = MISSING[question.key] ?? `Add ${question.label.toLowerCase()}.`;
      continue;
    }
    if (question.kind === "email" && !EMAIL.test(value)) errors[question.key] = "Check the email. It looks incomplete.";
    if (question.kind === "phone" && value.replace(/\D/g, "").length < PHONE_DIGITS) {
      errors[question.key] = "Check the phone number. It looks too short.";
    }
    if (question.kind === "url" && !value.includes(".")) errors[question.key] = "Check the link. It looks incomplete.";
  }
  // Weddings and pre-weddings need one way to reply; careers ask for both (Decisions 14 and 15).
  if (config.kind !== "careers" && !asText(values.phone) && !asText(values.email)) {
    errors.phone = "Add a phone number or an email so we can reply.";
  }
  if (!consented) errors.consent = "Please tick this so we can reply.";
  return errors;
}

export const fillThankYou = (text: string, values: FormValues) =>
  text.replace(/\[names?\]/g, asText(values.names ?? values.name) || "there");
