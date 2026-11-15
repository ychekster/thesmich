import { site } from "../../content/site";
import { WaveText } from "../WaveText/WaveText";
import { reveal } from "../Pager/Pager";
import s from "./Footer.module.css";

interface Props {
  live: boolean;
  onQuiz: () => void;
  onContact: () => void;
  onFaq: () => void;
}

export function Footer({ live, onQuiz, onContact, onFaq }: Props) {
  const { contacts } = site;
  return (
    <footer className={s.footer}>
      <div className={s.grid}>
        <div className={s.about} {...reveal(0)}>
          <div className={s.logo}>{site.brand}<span>.</span></div>
          <p>{site.about}</p>
        </div>
        <nav className={s.col} aria-label="Услуги" {...reveal(1)}>
          <p className={s.t}>Услуги</p>
          <button type="button" onClick={onQuiz}>Сайт-каталог</button>
          <button type="button" onClick={onQuiz}>Интернет-магазин</button>
          <button type="button" onClick={onQuiz}>Продвижение</button>
          <button type="button" onClick={onQuiz}>Редизайн и переезд</button>
        </nav>
        <nav className={s.col} aria-label="Разделы" {...reveal(2)}>
          <p className={s.t}>Разделы</p>
          <button type="button" onClick={onQuiz}>Рассчитать проект</button>
          <button type="button" onClick={onFaq}>Частые вопросы</button>
          <button type="button" onClick={onContact}>Оставить заявку</button>
        </nav>
        <div className={s.col} {...reveal(3)}>
          <p className={s.t}>Контакты</p>
          <a href={contacts.phoneHref}>{contacts.phone}</a>
          <a href={`mailto:${contacts.email}`}>{contacts.email}</a>
          <a href={contacts.telegram} target="_blank" rel="noopener">Telegram</a>
          <a href={contacts.instagram} target="_blank" rel="noopener">Instagram</a>
        </div>
      </div>

      {/* огромный логотип — буквы тоже расталкиваются курсором */}
      <div className={s.markWrap} {...reveal(4)}>
        <WaveText text={`${site.brand}.`} className={s.mark} play={live} live={live} strength="huge" step={16} delay={120} accentLast />
      </div>

      <div className={s.bottom} {...reveal(5)}>
        <span>© {new Date().getFullYear()} {site.brand}</span>
        <a href={site.privacyHref}>Политика конфиденциальности</a>
      </div>
    </footer>
  );
}
