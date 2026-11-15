import { channels } from "../../content/home";
import { Lines, r } from "../../pager/reveal";
import ui from "../ui.module.css";
import s from "./Channels.module.css";

/** Каналы продвижения: заголовок, фраза справа и белые «таблетки» площадок. */
export function Channels() {
  return (
    <div className={s.channels}>
      <div className={s.head}>
        <Lines lines={channels.title} className={ui.h2} />
        <p className={`${ui.lead} ${s.lead}`} {...r(2)}>
          {channels.lead[0]}<br className={ui.desktop} /> {channels.lead[1]}
        </p>
      </div>
      <ul className={s.list}>
        {channels.items.map((it, k) => (
          <li key={it.title} className={s.pill} {...r(3 + k)}>
            <span className={s.h}>{it.title}</span>
            <span className={s.t}>{it.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
