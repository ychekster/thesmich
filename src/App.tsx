import { useCallback, useEffect, useMemo, useState } from "react";
import { QUESTIONS } from "./content/quiz";
import { sendLead } from "./lib/lead";
import type { ChoiceAnswer, Contacts } from "./types";
import { Header } from "./components/Header/Header";
import { Screen, type ScreenState } from "./components/Screen/Screen";
import { Hero } from "./components/Hero/Hero";
import { Roulette } from "./components/Roulette/Roulette";
import { Pager, type Page } from "./components/Pager/Pager";
import { FaqCards } from "./components/FaqCards/FaqCards";
import { Footer } from "./components/Footer/Footer";
import { QuestionScreen } from "./components/Quiz/QuestionScreen";
import { DoneScreen } from "./components/Quiz/DoneScreen";
import s from "./App.module.css";

/*
 * Экраны по номерам: 0 — главная (полноэкранные секции Pager: первый экран, рулетка,
 * частые вопросы, футер — один жест = одна секция), 1..N — вопросы анкеты
 * (N-й — контакты), N+1 — «Спасибо».
 */
const N = QUESTIONS.length;
const DONE = N + 1;
/** Секции главной по порядку; id — якорь в адресе (/#faq). */
const PAGES = ["top", "bonus", "faq", "contacts"] as const;
const FAQ_PAGE = PAGES.indexOf("faq");

export default function App() {
  // /#quiz — сразу первый вопрос (кнопка «Рассчитать стоимость сайта» на визитках)
  const [cur, setCur] = useState(() => (location.hash === "#quiz" ? 1 : 0));
  const [answers, setAnswers] = useState<Record<string, ChoiceAnswer>>({});
  const [contacts, setContacts] = useState<Contacts>({ name: "", phone: "", email: "" });
  // последний выпавший бонус рулетки — уходит в заявку (меняется раз за прокрутку, не при скролле)
  const [bonus, setBonus] = useState<string | null>(null);
  // секция главной; /#faq и т.п. — сразу нужная секция
  const [page, setPage] = useState(() => Math.max(0, PAGES.indexOf(location.hash.slice(1) as typeof PAGES[number])));
  // секция под шапкой прямо сейчас (на середине пролистывания) — от неё цвет шапки
  const [under, setUnder] = useState(page);

  const go = useCallback((n: number) => setCur(Math.max(0, Math.min(DONE, n))), []);

  const next = useCallback(() => {
    if (cur === N) {
      sendLead(answers, contacts, bonus);
      go(DONE);
    } else go(cur + 1);
  }, [cur, answers, contacts, bonus, go]);

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

  const state = (i: number): ScreenState => (i === cur ? "active" : i < cur ? "past" : "future");

  /*
   * Производительность: смена секции не должна перерисовывать всё приложение.
   * Каждая секция и блок анкеты — готовый элемент (useMemo): при смене секции
   * React перерисовывает только две секции, у которых поменялся live. Раньше
   * перерисовывалось всё (экраны анкеты, 60 плиток рулетки, сотни букв) — 50–60 мс
   * прямо в момент жеста, фриз в начале перехода.
   */
  const toQuiz = useCallback(() => go(1), [go]);
  const toContacts = useCallback(() => go(N), [go]);
  const toFaq = useCallback(() => setPage(FAQ_PAGE), []);
  // live — секция на экране: буквы собираются заново и реагируют на курсор,
  // карты раздаются, контент проявляется (reveal в Pager) при каждом заходе
  // ready — прогрев видеокарты закончен (Pager): до него первый экран не начинает появляться
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const on = cur === 0 && ready;
  const l0 = on && page === 0, l1 = on && page === 1, l2 = on && page === 2, l3 = on && page === 3;
  const hero = useMemo(() => <Hero active={l0} questions={N} onStart={toQuiz} />, [l0, toQuiz]);
  const roulette = useMemo(() => <Roulette live={l1} onBonus={setBonus} onApply={toContacts} />, [l1, toContacts]);
  const faq = useMemo(() => <FaqCards live={l2} />, [l2]);
  const footer = useMemo(
    () => <Footer live={l3} onQuiz={toQuiz} onContact={toContacts} onFaq={toFaq} />,
    [l3, toQuiz, toContacts, toFaq],
  );
  const pages: Page[] = useMemo(() => [
    { id: PAGES[0], label: "Главная", bg: "dark", node: hero },
    { id: PAGES[1], label: "Бонус", bg: "blue", node: roulette },
    { id: PAGES[2], label: "Частые вопросы", bg: "light", light: true, node: faq },
    { id: PAGES[3], label: "Контакты", bg: "graphite", fill: true, node: footer },
  ], [hero, roulette, faq, footer]);

  const onAnswer = useCallback((id: string, a: ChoiceAnswer) => setAnswers(prev => ({ ...prev, [id]: a })), []);
  const quiz = useMemo(() => (
    <>
      {QUESTIONS.map((q, i) => (
        <Screen key={q.id} state={state(i + 1)}>
          <QuestionScreen
            q={q} index={i} total={N} active={cur === i + 1}
            answer={answers[q.id]} contacts={contacts} bonus={bonus}
            onAnswer={a => onAnswer(q.id, a)}
            onContacts={setContacts}
            onNext={next}
          />
        </Screen>
      ))}
      <Screen state={state(DONE)}>
        <DoneScreen bonus={bonus} />
      </Screen>
    </>
    // eslint-disable-next-line react-hooks/exhaustive-deps -- state() зависит только от cur
  ), [cur, answers, contacts, bonus, next, onAnswer]);

  return (
    <>
      <Header
        step={cur > 0 && cur <= N ? cur : null}
        total={N}
        showCta={cur < N}
        onBack={() => go(cur - 1)}
        onCta={toContacts}
        onHome={() => { go(0); setPage(0); }}
        tone={cur !== 0 ? "dark" : pages[under].light ? "light" : pages[under].bg === "blue" ? "vivid" : "dark"}
      />

      <main>
        <Screen state={state(0)} full>
          <Pager pages={pages} index={page} onIndex={setPage} enabled={cur === 0} onReady={onReady} onUnderHeader={setUnder} />
        </Screen>
        {quiz}
      </main>

      <div className={s.progress}>
        <i style={{ width: `${cur === 0 ? 0 : Math.min(cur / (N + 1), 1) * 100}%` }} />
      </div>
    </>
  );
}
