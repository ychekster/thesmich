import { sites } from "../../content/home";
import { Lines, r } from "../../pager/reveal";
import ui from "../ui.module.css";
import s from "./Sites.module.css";

/** Какие сайты делаем: «САЙТЫ — которые продают…» и карточки с номерами. */
export function Sites() {
  return (
    <div className={s.sites}>
      <div className={s.head}>
        <Lines lines={[sites.title]} className={ui.h1} />
        <p className={`${ui.tagline} ${ui.desktop} ${s.tagline}`} {...r(1)}>
          {sites.tagline[0]}<br />{sites.tagline[1]}
        </p>
        <p className={`${ui.body} ${ui.mobile} ${s.lead}`} {...r(1)}>{sites.lead}</p>
      </div>
      <ul className={s.grid}>
        {sites.items.map((it, k) => (
          <li key={it.title} className={s.card} {...r(2 + k)}>
            <span className={s.n}>{String(k + 1).padStart(2, "0")}</span>
            <h3 className={s.h}>{it.title}</h3>
            <p className={s.t}>{it.text}</p>
            <span className={ui.corner} aria-hidden="true" />
          </li>
        ))}
      </ul>
    </div>
  );
}
