import { channels } from "../../content/home";
import { Lines, r } from "../../pager/reveal";
import ui from "../ui.module.css";
import s from "./Channels.module.css";

/** Каналы продвижения: список площадок крупным шрифтом. */
export function Channels() {
  return (
    <div className={s.channels}>
      <div>
        <p className={ui.eyebrow} {...r(0)}>{channels.eyebrow}</p>
        <Lines lines={channels.title} className={ui.title} from={1} />
      </div>
      <ul className={s.list}>
        {channels.items.map((it, k) => (
          <li key={it.title} className={s.item} {...r(3 + k)}>
            <span className={s.h}>{it.title}</span>
            <span className={s.t}>{it.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
