import { channels, type ChannelsData } from "../../content/home";
import { Lines, r } from "../../pager/reveal";
import ui from "../ui.module.css";
import s from "./Channels.module.css";

/**
 * Каналы продвижения: заголовок, фраза справа и белые «таблетки» площадок (2 × 4).
 * Тот же слайд — в КП (data из content/kp.ts).
 */
export function Channels({ data = channels }: { data?: ChannelsData }) {
  return (
    <div className={s.channels}>
      <div className={s.head}>
        <Lines lines={data.title} className={ui.h2} />
        <p className={s.lead} {...r(2)}>
          <span className={ui.desktop}>{data.lead[0]} {data.lead[1]}</span>
          <span className={ui.mobile}>{data.leadMobile}</span>
        </p>
      </div>
      <ul className={s.list}>
        {data.items.map((it, k) => (
          <li key={it.title} className={s.pill} {...r(3 + k)}>
            <span className={s.h}>{it.title}</span>
            {it.textMobile ? (
              <>
                <span className={`${s.t} ${ui.desktop}`}>{it.text}</span>
                <span className={`${s.t} ${ui.mobile}`}>{it.textMobile}</span>
              </>
            ) : <span className={s.t}>{it.text}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
