import { useRef, useState } from "react";
import { BONUSES, wheelText } from "../../content/wheel";
import { reducedMotion } from "../../lib/media";
import { store } from "../../lib/store";
import { nav } from "../../pager/nav";
import { r } from "../../pager/reveal";
import ui from "../ui.module.css";
import s from "./Wheel.module.css";

const N = BONUSES.length;
const SEG = 360 / N;
/** Длительность прокрутки, мс (макет: 4 с; кривая — transition в Wheel.module.css). */
const SPIN_MS = 4000;
/** Колесо в макете: viewBox 700, центр 350, радиус секторов 330, надписи на радиусе 205. */
const C = 350, R = 330, LABEL_R = 205;
/** Цвета секторов по кругу (макет): красный, белый, тёмный, белый. */
const FILL = [s.segRed, s.segWhite, s.segDark, s.segWhite];

/** Точка на окружности; угол от верха по часовой. */
const pt = (deg: number, rad = R) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return `${(C + rad * Math.cos(a)).toFixed(2)} ${(C + rad * Math.sin(a)).toFixed(2)}`;
};

/**
 * Колесо бонусов (макет 2026-11-17): SVG-колесо поворачивается одним CSS-переходом transform (ведёт
 * композитор). Выигрыш выбирается заранее (равные шансы), под указатель встаёт
 * случайная точка его сектора. Крутить можно сколько угодно; последний бонус
 * уходит в форму заявки (lib/store.ts).
 */
export function Wheel() {
  const wheelRef = useRef<SVGSVGElement>(null);
  const angle = useRef(0);
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState<number | null>(null);

  const spin = () => {
    if (spinning) return;
    const w = Math.floor(Math.random() * N);
    const jitter = (Math.random() - 0.5) * SEG * 0.7;
    // сектор w под указателем сверху, когда поворот ≡ −w·SEG (mod 360)
    const want = (((-w * SEG + jitter) % 360) + 360) % 360;
    const now = ((angle.current % 360) + 360) % 360;
    // макет: +1800° (пять оборотов) и докрутка до выпавшего сектора
    angle.current += 1800 + ((want - now + 360) % 360);
    const el = wheelRef.current!;
    const done = () => {
      setSpinning(false);
      setWon(w);
      store.set({ bonus: BONUSES[w].full });
    };
    setSpinning(true);
    setWon(null);
    el.style.transform = `rotate(${angle.current.toFixed(2)}deg)`;
    if (reducedMotion()) { done(); return; }
    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName !== "transform") return;
      el.removeEventListener("transitionend", onEnd);
      done();
    };
    el.addEventListener("transitionend", onEnd);
  };

  return (
    <div className={s.wrap}>
      {/* слева: заголовок сверху, слот «Ваш бонус» и кнопки снизу; на телефоне колонка
          «раскрывается» (display: contents) и колесо встаёт между слотом и кнопками */}
      <div className={s.left}>
        <h2 className={`${ui.h2} ${s.title}`} {...r(0)}>
          {wheelText.title[0]}<br />{wheelText.title[1]}
        </h2>
        <div className={s.slot} aria-live="polite" {...r(1)}>
          <p className={s.slotLabel}>{wheelText.result}</p>
          {won === null ? (
            <p className={s.hint}>{wheelText.hint}</p>
          ) : (
            <>
              <p className={s.prize}>{BONUSES[won].short.toUpperCase()}</p>
              <p className={s.prizeText}>{BONUSES[won].text}</p>
            </>
          )}
          <span className={ui.corner} aria-hidden="true" />
        </div>
        <div className={s.actions} data-won={won !== null ? "" : undefined} {...r(4)}>
          {won === null ? (
            <button className={`${ui.btn} ${ui.btnRed}`} type="button" onClick={spin} disabled={spinning}>{wheelText.spin}</button>
          ) : (
            <>
              <button className={`${ui.btn} ${ui.btnRed}`} type="button" onClick={() => nav.go("contacts")}>{wheelText.apply}</button>
              <button className={ui.btn} type="button" onClick={spin} disabled={spinning}>{wheelText.again}</button>
            </>
          )}
        </div>
      </div>

      <div className={s.stage} {...r(3)}>
        <svg className={s.pointer} viewBox="0 0 44 40" aria-hidden="true"><path d="M0 0 H44 L22 40 Z" /></svg>
        <div className={s.disc}>
          <svg
            ref={wheelRef} className={s.wheel} viewBox="0 0 700 700" role="img"
            aria-label={`${wheelText.label}: ${BONUSES.map(b => b.short).join(", ")}`}
            style={{ transitionDuration: `${SPIN_MS}ms` }}
          >
            {BONUSES.map((b, k) => {
              const a0 = k * SEG - SEG / 2, a1 = a0 + SEG;
              const fill = FILL[k % FILL.length];
              return (
                <g key={k}>
                  <path d={`M${C} ${C} L${pt(a0)} A${R} ${R} 0 0 1 ${pt(a1)} Z`} className={fill} />
                  <text
                    x={C + LABEL_R} y={C} transform={`rotate(${k * SEG - 90} ${C} ${C})`}
                    textAnchor="middle" dominantBaseline="middle"
                    className={`${s.label} ${fill === s.segWhite ? s.labelDark : ""}`}
                    fontSize={b.short.length > 12 ? 19 : 22}
                  >{b.short.toUpperCase()}</text>
                </g>
              );
            })}
            <circle cx={C} cy={C} r={R} className={s.rim} />
            <circle cx={C} cy={C} r="54" className={s.hub} />
            <circle cx={C} cy={C} r="16" className={s.segRed} />
          </svg>
        </div>
      </div>

    </div>
  );
}
