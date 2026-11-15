import { partners } from "../../content/home";
import { site } from "../../content/site";
import { Lines, r } from "../../pager/reveal";
import ui from "../ui.module.css";
import s from "./Partners.module.css";

/**
 * Вакансии: посыл «с нами можно работать без опыта» и кнопка в личку (Telegram).
 * Условия на сайте не называем (docs/PLAN.md).
 */
export function Partners() {
  return (
    <div className={s.wrap}>
      <p className={ui.eyebrow} {...r(0)}>{partners.eyebrow}</p>
      <Lines lines={partners.title} className={`${ui.title} ${s.title}`} from={1} />
      <p className={ui.lead} {...r(3)}>{partners.lead}</p>
      <ol className={s.steps}>
        {partners.points.map((st, k) => (
          <li key={st.n} className={s.step} {...r(4 + k)}>
            <span className={s.n}>{st.n}</span>
            <span>{st.text}</span>
          </li>
        ))}
      </ol>
      <div className={s.cta} {...r(7)}>
        <a className={ui.btn} href={site.contacts.telegram} target="_blank" rel="noreferrer">{partners.cta}</a>
      </div>
    </div>
  );
}
