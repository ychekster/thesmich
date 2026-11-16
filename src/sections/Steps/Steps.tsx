import { Fragment, type CSSProperties } from "react";
import { build, growth } from "../../content/home";
import { r } from "../../pager/reveal";
import ui from "../ui.module.css";
import s from "./Steps.module.css";

type Kind = "build" | "growth";
const DATA = { build, growth };
/** Нумерация сквозная: разработка — 01–05, продвижение — 06–10. */
const FIRST = { build: 1, growth: 6 };

/**
 * Этапы работы (две секции подряд): заголовок, пять этапов в ряд и красная
 * линия-маршрут через квадраты этапов. В «Разработке» линия уходит за нижний
 * край экрана, в «Продвижении» приходит сверху в той же точке и кончается
 * стрелкой — при перелистывании это один маршрут. Линии — div'ы (а не SVG),
 * чтобы их концы тянулись до краёв экрана любой высоты.
 */
export function Steps({ kind }: { kind: Kind }) {
  const d = DATA[kind];
  return (
    <div className={`${s.stage} ${s[kind]}`}>
      <div className={s.rail} aria-hidden="true">
        {kind === "build" ? (
          <>
            <i className={`${s.dot} ${s.b_dot}`} />
            <i className={`${s.ln} ${s.b_h}`} />
            <i className={`${s.ln} ${s.b_v}`} />
            <i className={`${s.ln} ${s.b_mh} ${ui.mobile}`} />
          </>
        ) : (
          <>
            <i className={`${s.ln} ${s.g_v1}`} />
            <i className={`${s.ln} ${s.g_h1}`} />
            <i className={`${s.ln} ${s.g_v2}`} />
            <i className={`${s.ln} ${s.g_h2} ${ui.desktop}`} />
            <i className={s.arrow} />
          </>
        )}
      </div>

      <div className={s.head}>
        <h2 className={`${ui.h2} ${s.title}`} {...r(0)}>
          {d.title.map((l, k) => (
            <Fragment key={k}>{k > 0 && <>{" "}<br className={ui.mobile} /></>}{l}</Fragment>
          ))}
        </h2>
        <p className={`${ui.body} ${s.lead}`} {...r(1)}>{d.lead}</p>
      </div>

      <ol className={s.list}>
        {d.items.map((it, k) => {
          const n = String(FIRST[kind] + k).padStart(2, "0");
          return (
            <li key={it.title} className={s.step} style={{ "--i": k } as CSSProperties} {...r(2 + k)}>
              <span className={`${s.n} ${ui.desktop}`}>{n}</span>
              <i className={s.sq} aria-hidden="true" />
              <div className={s.text}>
                <h3 className={s.h}><span className={`${s.nInline} ${ui.mobile}`}>{n}{"  "}</span>{it.title}</h3>
                <p className={s.t}>{it.text}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
