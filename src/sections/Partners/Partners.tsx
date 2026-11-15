import { partners } from "../../content/home";
import { site } from "../../content/site";
import { Lines, r } from "../../pager/reveal";
import ui from "../ui.module.css";
import s from "./Partners.module.css";

/**
 * Карьера: список вакансий, «Подробнее» — в личку (Telegram).
 * Условия и цифры на сайте не называем (docs/PLAN.md).
 */
export function Partners() {
  return (
    <div className={s.wrap}>
      <Lines lines={[partners.title]} className={ui.h1} />
      <ul className={s.list}>
        {partners.jobs.map((j, k) => (
          <li key={j.title} className={s.job} {...r(1 + k)}>
            <div className={s.info}>
              <h3 className={s.h}>{j.title}</h3>
              <p className={s.t}>{j.text}</p>
            </div>
            <a className={s.more} href={site.contacts.telegram} target="_blank" rel="noreferrer">{partners.more}</a>
            <span className={ui.corner} aria-hidden="true" />
          </li>
        ))}
      </ul>
    </div>
  );
}
