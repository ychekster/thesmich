import { useCallback, useEffect, useRef, useState } from "react";
import { QUESTIONS } from "./content/quiz";
import { sendLead } from "./lib/lead";
import type { ChoiceAnswer, Contacts } from "./types";
import { Header } from "./components/Header/Header";
import { Screen, type ScreenState } from "./components/Screen/Screen";
import { Hero } from "./components/Hero/Hero";
import { FaqCards } from "./components/FaqCards/FaqCards";
import { Footer } from "./components/Footer/Footer";
import { QuestionScreen } from "./components/Quiz/QuestionScreen";
import { DoneScreen } from "./components/Quiz/DoneScreen";
import s from "./App.module.css";

/*
 * Экраны по номерам: 0 — главная (листается: первый экран, вопросы-карты, футер),
 * 1..N — вопросы анкеты (N-й — контакты), N+1 — «Спасибо».
 */
const N = QUESTIONS.length;
const DONE = N + 1;

export default function App() {
  const [cur, setCur] = useState(0);
  const [answers, setAnswers] = useState<Record<string, ChoiceAnswer>>({});
  const [contacts, setContacts] = useState<Contacts>({ name: "", phone: "", email: "" });
  const [frosted, setFrosted] = useState(false);
  const homeRef = useRef<HTMLElement>(null);

  const go = useCallback((n: number) => setCur(Math.max(0, Math.min(DONE, n))), []);

  const next = useCallback(() => {
    if (cur === N) {
      sendLead(answers, contacts);
      go(DONE);
    } else go(cur + 1);
  }, [cur, answers, contacts, go]);

  // Esc — назад (кроме главной и «Спасибо»)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "Escape" && cur > 0 && cur <= N && t.tagName !== "INPUT") go(cur - 1);
      // Enter на главной — начать анкету (если фокус не на кнопке/карте)
      if (e.key === "Enter" && cur === 0 && t.tagName !== "BUTTON" && t.getAttribute("role") !== "button") go(1);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [cur, go]);

  // шапка матовая, если активный экран пролистан
  useEffect(() => { setFrosted(cur === 0 && (homeRef.current?.scrollTop ?? 0) > 8); }, [cur]);
  // при прокрутке React трогаем только когда матовость реально меняется
  const frostedRef = useRef(frosted);
  frostedRef.current = frosted;
  const onHomeScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const f = e.currentTarget.scrollTop > 8;
    if (f !== frostedRef.current) { frostedRef.current = f; setFrosted(f); }
  }, []);

  const state = (i: number): ScreenState => (i === cur ? "active" : i < cur ? "past" : "future");
  const scrollToFaq = () => document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" });

  return (
    <>
      <Header
        frosted={frosted}
        step={cur > 0 && cur <= N ? cur : null}
        total={N}
        showCta={cur < N}
        onBack={() => go(cur - 1)}
        onCta={() => go(N)}
      />

      <main>
        <Screen ref={homeRef} state={state(0)} scroll onScroll={onHomeScroll}>
          <Hero active={cur === 0} questions={N} onStart={() => go(1)} />
          <FaqCards live={cur === 0} />
          <Footer live={cur === 0} onQuiz={() => go(1)} onContact={() => go(N)} onFaq={scrollToFaq} />
        </Screen>

        {QUESTIONS.map((q, i) => (
          <Screen key={q.id} state={state(i + 1)}>
            <QuestionScreen
              q={q} index={i} total={N} active={cur === i + 1}
              answer={answers[q.id]} contacts={contacts}
              onAnswer={a => setAnswers(prev => ({ ...prev, [q.id]: a }))}
              onContacts={setContacts}
              onNext={next}
            />
          </Screen>
        ))}

        <Screen state={state(DONE)}>
          <DoneScreen />
        </Screen>
      </main>

      <div className={s.progress}>
        <i style={{ width: `${cur === 0 ? 0 : Math.min(cur / (N + 1), 1) * 100}%` }} />
      </div>
    </>
  );
}
