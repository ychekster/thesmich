import { partners } from "../../content/home";
import { Lines, r } from "../../pager/reveal";
import ui from "../ui.module.css";
import s from "./Partners.module.css";

/** Вакансии: список вакансий, «Подробнее» — страница вакансии (/vacancy-…/). */
export function Partners() {
  return (
    <div className={s.wrap}>
      <Lines lines={[partners.title]} className={ui.h1} />
      <ul className={s.list}>
        {partners.jobs.map((j, k) => (
          <li key={j.title} className={s.job} {...r(1 + k)}>
            <div className={s.info}>
              <h3 className={s.h}>
                {j.titleMobile ? <><span className={ui.desktop}>{j.title}</span><span className={ui.mobile}>{j.titleMobile}</span></> : j.title}
              </h3>
              <p className={s.t}>{j.text}</p>
            </div>
            <a className={s.more} href={j.href}>{partners.more}</a>
            <span className={ui.corner} aria-hidden="true" />
          </li>
        ))}
      </ul>
    </div>
  );
}
