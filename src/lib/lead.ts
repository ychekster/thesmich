import { QUESTIONS } from "../content/quiz";
import type { ChoiceAnswer, ChoiceQuestion, Contacts } from "../types";

/** Куда отправлять заявку. Задаётся в .env: VITE_LEAD_ENDPOINT=https://… */
const ENDPOINT = import.meta.env.VITE_LEAD_ENDPOINT as string | undefined;

/** Превращает ответ на вопрос с вариантами в текст для заявки. */
export function answerText(q: ChoiceQuestion, a: ChoiceAnswer | undefined): string | string[] | undefined {
  if (!a || !a.picked.length) return undefined;
  const vals = a.picked.map(i => (q.options[i].own ? `Свой вариант: ${a.own.trim()}` : q.options[i].v));
  return q.type === "single" ? vals[0] : vals;
}

/** Собирает заявку из ответов и отправляет её. Без ENDPOINT — только пишет в консоль. */
export async function sendLead(answers: Record<string, ChoiceAnswer>, contacts: Contacts) {
  const payload: Record<string, unknown> = { submittedAt: new Date().toISOString() };
  for (const q of QUESTIONS) {
    if (q.type !== "contact") payload[q.id] = answerText(q, answers[q.id]);
  }
  Object.assign(payload, contacts);

  console.log("Заявка:", payload);
  if (!ENDPOINT) return;
  try {
    await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("Не удалось отправить заявку", e);
  }
}
