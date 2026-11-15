import { site } from "../../content/site";
import { TelegramIcon, InstagramIcon } from "../icons";
import s from "./Header.module.css";

interface Props {
  /** Номер вопроса для счётчика; null — не в анкете. */
  step: number | null;
  total: number;
  /** Показывать кнопку «Оставить заявку» (скрыта на контактах и после отправки). */
  showCta: boolean;
  onBack: () => void;
  onCta: () => void;
  /** Логотип — на первую секцию главной. */
  onHome: () => void;
  /** Фон секции под шапкой: light — тёмные надписи, vivid (синий) — белый акцент. */
  tone: "dark" | "light" | "vivid";
}

/** Шапка висит поверх всех экранов и секций; контент под неё не заезжает (--header). */
export function Header({ step, total, showCta, onBack, onCta, onHome, tone }: Props) {
  const inQuiz = step !== null;
  return (
    <header className={s.top} data-tone={tone}>
      <button className={s.logo} type="button" onClick={onHome}>{site.brand}<span>.</span></button>
      <div className={s.nav}>
        <button className={`${s.back} ${inQuiz ? "" : s.hide}`} type="button" onClick={onBack} tabIndex={inQuiz ? 0 : -1}>‹ Назад</button>
        <span className={`${s.counter} ${inQuiz ? "" : s.hide}`}>{inQuiz ? `${step} / ${total}` : ""}</span>
        <a className={s.phone} href={site.contacts.phoneHref}>{site.contacts.phone}</a>
        <div className={s.socials}>
          <a className={s.social} href={site.contacts.telegram} target="_blank" rel="noopener" aria-label="Telegram" title="Telegram"><TelegramIcon /></a>
          <a className={s.social} href={site.contacts.instagram} target="_blank" rel="noopener" aria-label="Instagram" title="Instagram"><InstagramIcon /></a>
        </div>
        {showCta && <button className={s.cta} type="button" onClick={onCta}>Оставить заявку</button>}
      </div>
    </header>
  );
}
