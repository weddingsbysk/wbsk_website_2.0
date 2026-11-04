import { shownQuestions, validateForm, type FormConfig, type FormQuestion, type FormValues } from "./forms";

/** The question added for the chat (owner, 4 November 2026); the Studio can reword or hide it once it's in the form. */
export const CAMERA_QUESTION: FormQuestion = {
  key: "cameras",
  label: "How many cameramen do you need?",
  kind: "one",
  shown: true,
  required: false,
  choices: ["1", "2", "3", "4 or more", "Not sure, please suggest"],
};

/** A chat's order is a conversation's: who, where and what first, and contact details near the end. */
const CHAT_ORDER = ["names", "place", "cameras", "date", "weddingType", "events", "days", "guests", "coverage", "phone", "email", "message"];

const ASK: Record<string, string> = {
  names: "Please tell me your name.",
  place: "Where is your wedding destination?",
  cameras: CAMERA_QUESTION.label,
  date: "When is the wedding? A month and year is enough.",
  weddingType: "Is it a destination wedding, or in your city?",
  events: "Which events should we be there for? Pick as many as you like.",
  days: "How many days will it run?",
  guests: "Roughly how many guests?",
  coverage: "What would you like from us?",
  phone: "What's the best number to reach you on? WhatsApp is perfect.",
  message: "Anything else you'd like us to know?",
};

const ASK_PRE_WEDDING: Record<string, string> = {
  place: "Where would you like to shoot?",
  date: "When are you thinking? A month is enough.",
};

/** What comes back after an answer. [first] is their first name, [answer] what they said. */
const REPLY: Record<string, string> = {
  names: "Lovely to meet you, [first].",
  place: "[answer], beautiful.",
  date: "Noted, thank you.",
  events: "That sounds wonderful.",
  guests: "Good to know.",
  phone: "Thank you.",
};

export type ChatStep = FormQuestion & { ask: string; reply?: string };

/** The questions as a conversation, using the Studio's wording where it's been filled in. */
export function chatSteps(config: FormConfig): ChatStep[] {
  const rank = (key: string) => {
    const place = CHAT_ORDER.indexOf(key);
    // Anything the order doesn't know goes just before the closing questions.
    return place === -1 ? CHAT_ORDER.indexOf("phone") - 0.5 : place;
  };
  return shownQuestions(config.questions)
    .map((question) => ({
      ...question,
      ask: question.ask || (config.kind === "preWedding" ? ASK_PRE_WEDDING[question.key] : undefined) || ASK[question.key] || question.label,
      reply: question.reply || REPLY[question.key],
    }))
    .sort((a, b) => rank(a.key) - rank(b.key));
}

/** Wedding and pre-wedding forms ask about cameramen, even before it's been added in the Studio. */
export function withCameraQuestion(config: FormConfig): FormConfig {
  if (config.kind === "careers" || config.questions.some((question) => question.key === CAMERA_QUESTION.key)) return config;
  return { ...config, questions: [...config.questions, CAMERA_QUESTION] };
}

const textOf = (value: FormValues[string] | undefined) => (Array.isArray(value) ? value.join(", ") : (value ?? "")).trim();

/** The email question depends on whether there's already a number to reply on. */
export function askFor(step: ChatStep, values: FormValues) {
  if (step.key !== "email" || step.ask !== step.label) return step.ask;
  return textOf(values.phone) ? "And your email, so we can send you a copy?" : "We need one way to reply. What's your email?";
}

export function replyFor(step: ChatStep, values: FormValues) {
  const answer = textOf(values[step.key]);
  if (!step.reply || !answer) return null;
  const first = textOf(values.names).split(/\s+/)[0] ?? "";
  return step.reply.replace(/\[first\]/g, first).replace(/\[answer\]/g, answer);
}

/** Why an answer can't be taken yet, using the form's own notes (Decision 16); null when it's fine. */
export function answerProblem(config: FormConfig, step: ChatStep, values: FormValues, emailStillToCome: boolean) {
  const errors = validateForm(config, values, true);
  if (step.key === "email" && !textOf(values.email) && errors.phone) return errors.phone;
  if (step.key === "phone" && !textOf(values.phone)) return emailStillToCome ? null : errors.phone ?? null;
  if (step.key === "names" && errors.names) return "Please add your name so we know who to write back to.";
  return errors[step.key] ?? null;
}

/** Whether a question can be passed over without answering. */
export function canSkip(step: ChatStep, values: FormValues) {
  if (step.key === "email") return Boolean(textOf(values.phone));
  if (step.key === "phone") return true;
  return !step.locked && !step.required;
}
