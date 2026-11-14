import { site } from "../../content/site";
import { TelegramIcon, InstagramIcon } from "../icons";
import s from "./Header.module.css";

interface Props {
  /** Шапка матовая (страницу пролистали). */
  frosted: boolean;
  /** Номер вопроса для счётчика; null — не в анкете. */
  step: number | null;
  total: number;
  /** Показывать кнопку «Оставить заявку» (скрыта на контактах и после отправки). */
  showCta: boolean;
  onBack: () => void;
  onCta: () => void;
}

export function Header({ frosted, step, total, showCta, onBack, onCta }: Props) {
  const inQuiz = step !== null;
  return (
    <header className={`${s.top} ${frosted ? s.frosted : ""}`}>
      <div className={s.logo}>{site.brand}<span>.</span></div>
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
