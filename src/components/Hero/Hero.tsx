import type { CSSProperties } from "react";
import { site } from "../../content/site";
import { WaveText } from "../WaveText/WaveText";
import s from "./Hero.module.css";

const LINES = ["Сайт, который", "работает на вас"];
const LETTERS = LINES.join("").replace(/\s/g, "").length;

interface Props {
  /** Главная активна: буквы появляются и реагируют на курсор. */
  active: boolean;
  questions: number;
  onStart: () => void;
}

/** Первый экран: заголовок из букв, описание и кнопка анкеты. */
export function Hero({ active, questions, onStart }: Props) {
  // описание и кнопка всплывают, когда допишется последняя буква заголовка
  const vars = { "--total": LETTERS } as CSSProperties;
  return (
    <div className={s.hero} style={vars}>
      <p className={s.eyebrow}>{site.tagline}</p>
      <WaveText
        as="h1" text={LINES} className={s.title} play={active} live={active} strength="big"
        lineClassNames={[s.l0, s.l1]}
      />
      <p className={s.lead}>
        Проектируем, делаем и наполняем сайт, а потом <b>приводим на него покупателей</b>.
        Ответьте на {questions} вопросов — пришлём расчёт стоимости и сроков.
      </p>
      <div className={s.cta}>
        <button className={s.btn} type="button" onClick={onStart}>Рассчитать проект</button>
        <span className={s.meta}>Около 2 минут</span>
      </div>
    </div>
  );
}
