import { site } from "../../content/site";
import { WaveText } from "../WaveText/WaveText";
import { reveal } from "../Pager/Pager";
import s from "./Hero.module.css";

const LINES = ["Сайт, который", "работает на вас"];

interface Props {
  /** Секция на экране: буквы собираются (заново при каждом заходе) и реагируют на курсор. */
  active: boolean;
  questions: number;
  onStart: () => void;
}

/** Первый экран: заголовок из букв, описание и кнопка анкеты. */
export function Hero({ active, questions, onStart }: Props) {
  // описание и кнопка проявляются (reveal), когда допишутся буквы заголовка
  return (
    <div className={s.hero}>
      <p className={s.eyebrow} {...reveal(0)}>{site.tagline}</p>
      <div {...reveal(1)}>
        <WaveText
          as="h1" text={LINES} className={s.title} play={active} live={active} strength="big"
          lineClassNames={[s.l0, s.l1]}
        />
      </div>
      <p className={s.lead} {...reveal(6)}>
        Проектируем, делаем и наполняем сайт, а потом <b>приводим на него покупателей</b>.
        Ответьте на {questions} вопросов — пришлём расчёт стоимости и сроков.
      </p>
      <div className={s.cta} {...reveal(7)}>
        <button className={s.btn} type="button" onClick={onStart}>Рассчитать проект</button>
        <span className={s.meta}>Около 2 минут</span>
      </div>
    </div>
  );
}
