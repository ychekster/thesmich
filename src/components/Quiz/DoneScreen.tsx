import { CheckIcon } from "../icons";
import s from "./Quiz.module.css";

/** Экран после отправки заявки. */
export function DoneScreen() {
  return (
    <div className={s.done}>
      <div className={s.ok}><CheckIcon size={40} width={2.4} /></div>
      <h2 className={s.title}>Спасибо.<br /><span className={s.grey}>Заявка у нас.</span></h2>
      <p className={s.lead}>Изучим ответы и в течение рабочего дня пришлём расчёт стоимости, сроков и план продвижения.</p>
    </div>
  );
}
