import { useEffect, useRef } from "react";
import type { ChoiceAnswer, ChoiceQuestion, Contacts, Question } from "../../types";
import { CheckIcon } from "../icons";
import { WaveText } from "../WaveText/WaveText";
import { wheelText } from "../../content/wheel";
import s from "./Quiz.module.css";

const EMPTY: ChoiceAnswer = { picked: [], own: "" };

interface Props {
  q: Question;
  index: number;
  total: number;
  active: boolean;
  answer?: ChoiceAnswer;
  contacts: Contacts;
  /** Бонус рулетки — показываем на экране контактов. */
  bonus?: string | null;
  onAnswer: (a: ChoiceAnswer) => void;
  onContacts: (c: Contacts) => void;
  onNext: () => void;
}

export function isValid(q: Question, a: ChoiceAnswer | undefined, c: Contacts) {
  if (q.type === "contact") return !!(c.name.trim() && c.phone.trim().length >= 4);
  if (!a || !a.picked.length) return false;
  const ownPicked = a.picked.some(i => q.options[i].own);
  return !ownPicked || !!a.own.trim();
}

/** Экран одного вопроса: заголовок из букв, варианты или поля контактов. */
export function QuestionScreen({ q, index, total, active, answer, contacts, bonus, onAnswer, onContacts, onNext }: Props) {
  const valid = isValid(q, answer, contacts);
  const last = index === total - 1;
  const showNext = q.type !== "single" || (answer?.picked.some(i => q.options[i].own) ?? false);
  const rootRef = useRef<HTMLDivElement>(null);

  // клавиатура: цифры — выбор варианта, Enter — дальше
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const inField = t.tagName === "INPUT" || t.tagName === "TEXTAREA";
      if (e.key === "Enter") {
        if (t.tagName === "BUTTON" || (t.getAttribute("role") === "button" && !inField)) return;
        if (valid) { e.preventDefault(); onNext(); }
        return;
      }
      if (inField || q.type === "contact") return;
      const k = parseInt(e.key, 10);
      if (k >= 1 && k <= q.options.length) rootRef.current?.querySelectorAll<HTMLElement>("[data-opt]")[k - 1]?.click();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [active, valid, q, onNext]);

  // на контактах — фокус в первое поле
  useEffect(() => {
    if (!active || q.type !== "contact") return;
    const t = setTimeout(() => rootRef.current?.querySelector("input")?.focus({ preventScroll: true }), 500);
    return () => clearTimeout(t);
  }, [active, q.type]);

  return (
    <div ref={rootRef}>
      <p className={s.num}>{String(index + 1).padStart(2, "0")} / {total}</p>
      <WaveText as="h2" text={q.title} className={s.title} play={active} live={active} step={16} delay={120} />
      {q.hint && <p className={s.hint}>{q.hint}</p>}
      {q.type === "contact" && bonus && (
        <p className={s.bonus}><span>{wheelText.attached}:</span> {bonus}</p>
      )}

      {q.type === "contact"
        ? <ContactFields value={contacts} onChange={onContacts} />
        : <Choices q={q} answer={answer ?? EMPTY} onAnswer={onAnswer} onNext={onNext} />}

      <div className={s.actions}>
        {showNext && (
          <button className={s.btn} type="button" disabled={!valid} onClick={onNext}>{last ? "Отправить" : "Далее"}</button>
        )}
        <span className={s.kbd}>
          {q.type === "contact" ? <><b>Enter</b> ↵</> : <>Нажмите <b>1–{q.options.length}</b></>}
        </span>
      </div>
    </div>
  );
}

function Choices({ q, answer, onAnswer, onNext }: { q: ChoiceQuestion; answer: ChoiceAnswer; onAnswer: (a: ChoiceAnswer) => void; onNext: () => void }) {
  const ownInput = useRef<HTMLInputElement>(null);
  const focusOwn = () => requestAnimationFrame(() => ownInput.current?.focus());

  const pick = (k: number) => {
    const o = q.options[k];
    if (q.type === "single") {
      onAnswer({ picked: [k], own: answer.own });
      if (o.own) focusOwn(); else setTimeout(onNext, 320);
      return;
    }
    const on = !answer.picked.includes(k);
    let picked = answer.picked.filter(i => i !== k);
    if (on) picked = o.only ? [k] : [...picked.filter(i => !q.options[i].only), k];
    onAnswer({ picked, own: answer.own });
    if (on && o.own) focusOwn();
  };

  return (
    <div className={`${s.list} ${q.cols ? s.cols : ""}`}>
      {q.options.map((o, k) => {
        const sel = answer.picked.includes(k);
        const body = (
          <>
            <span className={s.k}>{String(k + 1).padStart(2, "0")}</span>
            <span className={s.t}>{o.v}</span>
            {o.own && (
              <input
                ref={ownInput} className={s.ownInput} placeholder="Напишите свой ответ" autoComplete="off"
                value={answer.own} onChange={e => onAnswer({ ...answer, own: e.target.value })}
                onClick={e => { if (sel) e.stopPropagation(); }}
              />
            )}
            {o.d && <span className={s.d}>{o.d}</span>}
            {q.type === "multi" && <span className={s.mark}><CheckIcon size={13} /></span>}
          </>
        );
        const cls = `${s.opt} ${sel ? s.sel : ""} ${o.own ? s.own : ""}`;
        return o.own ? (
          <div
            key={k} data-opt className={cls} role="button" tabIndex={0} aria-pressed={sel}
            onClick={() => pick(k)}
            onKeyDown={e => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); pick(k); } }}
          >{body}</div>
        ) : (
          <button key={k} data-opt type="button" className={cls} aria-pressed={sel} onClick={() => pick(k)}>{body}</button>
        );
      })}
    </div>
  );
}

function ContactFields({ value, onChange }: { value: Contacts; onChange: (c: Contacts) => void }) {
  const set = (k: keyof Contacts) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className={s.fields}>
      <input className={s.field} placeholder="Имя" autoComplete="name" value={value.name} onChange={set("name")} />
      <input className={s.field} placeholder="Телефон или @telegram" autoComplete="tel" value={value.phone} onChange={set("phone")} />
      <input className={`${s.field} ${s.wide}`} placeholder="Email — необязательно" autoComplete="email" value={value.email} onChange={set("email")} />
    </div>
  );
}
