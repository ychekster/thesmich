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
/** Длительность прокрутки, мс (должна совпадать с transition в Wheel.module.css). */
const SPIN_MS = 5600;
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
 * Колесо бонусов: SVG-колесо поворачивается одним CSS-переходом transform (ведёт
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
    angle.current += 360 * 6 + ((want - now + 360) % 360);
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
      {/* слева: заголовок, текст, три шага, кнопки; на телефоне колонка «раскрывается»
          (display: contents) и колесо встаёт между текстом и кнопками */}
      <div className={s.left}>
        <h2 className={`${ui.h2} ${s.title}`} {...r(0)}>
          {wheelText.title[0]}<br />{wheelText.title[1]}
        </h2>
        <p className={s.lead} {...r(1)}>
          <span className={ui.desktop}>{wheelText.lead}</span>
          <span className={ui.mobile}>{wheelText.leadShort}</span>
        </p>
        <ol className={s.steps} {...r(2)}>
          {wheelText.steps.map((st, k) => (
            <li key={st.title} className={s.step}>
              <span className={s.n}>{String(k + 1).padStart(2, "0")}</span>
              <div className={s.stepText}>
                <h3 className={s.stepH}>{st.title}</h3>
                <p className={s.stepT}>{st.text}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* до прокрутки — только кнопка (как в макете), после — бонус и две кнопки */}
        <div className={s.result} aria-live="polite" {...r(4)}>
          {won !== null && (
            <p className={s.prize}>
              <span className={s.prizeLabel}>{wheelText.result}</span>
              <span className={s.prizeText}>{BONUSES[won].full}</span>
            </p>
          )}
          <div className={s.actions}>
            <button className={ui.btn} type="button" onClick={spin} disabled={spinning}>
              {won !== null ? wheelText.again : wheelText.spin}
            </button>
            {won !== null && (
              <button className={ui.btn} type="button" onClick={() => nav.go("contacts")}>{wheelText.apply}</button>
            )}
          </div>
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
