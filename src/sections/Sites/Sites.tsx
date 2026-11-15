import { sites } from "../../content/home";
import { Lines, r } from "../../pager/reveal";
import ui from "../ui.module.css";
import s from "./Sites.module.css";

/** Какие сайты делаем: карточки типов сайтов. */
export function Sites() {
  return (
    <div className={s.sites}>
      <div>
        <p className={ui.eyebrow} {...r(0)}>{sites.eyebrow}</p>
        <Lines lines={sites.title} className={ui.title} from={1} />
      </div>
      <ul className={s.grid}>
        {sites.items.map((it, k) => (
          <li key={it.title} className={s.card} {...r(3 + k)}>
            <span className={s.n}>{String(k + 1).padStart(2, "0")}</span>
            <h3 className={s.h}>{it.title}</h3>
            <p className={s.t}>{it.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
