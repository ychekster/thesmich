import { useRef, useState } from "react";
import { BONUSES, wheelText } from "../../content/wheel";
import { reducedMotion } from "../../lib/media";
import { store } from "../../lib/store";
import { nav } from "../../pager/nav";
import { Lines, r } from "../../pager/reveal";
import ui from "../ui.module.css";
import s from "./Wheel.module.css";

const N = BONUSES.length;
const SEG = 360 / N;
/** Длительность прокрутки, мс (должна совпадать с transition в Wheel.module.css). */
const SPIN_MS = 5600;

/** Точка на окружности (viewBox 200×200, центр 100,100); угол от верха по часовой. */
const pt = (deg: number, rad = 100) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return `${(100 + rad * Math.cos(a)).toFixed(3)} ${(100 + rad * Math.sin(a)).toFixed(3)}`;
};

/**
 * Колесо фортуны: SVG-колесо поворачивается одним CSS-переходом transform (ведёт
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
      <div className={s.text}>
        <p className={ui.eyebrow} {...r(0)}>{wheelText.eyebrow}</p>
        <Lines lines={wheelText.title} className={`${ui.title} ${s.title}`} from={1} />
        <p className={ui.lead} {...r(3)}>{wheelText.lead}</p>
        <div className={s.result} aria-live="polite" {...r(4)}>
          <div className={s.prize} data-on={won !== null ? "" : undefined}>
            <span className={s.prizeLabel}>{wheelText.result}</span>
            <span className={s.prizeText}>{won !== null ? BONUSES[won].full : " "}</span>
          </div>
          <div className={s.actions}>
            <button className={`${ui.btn} ${won !== null ? ui.ghost : ""}`} type="button" onClick={spin} disabled={spinning}>
              {won !== null ? wheelText.again : wheelText.spin}
            </button>
            {won !== null && (
              <button className={ui.btn} type="button" onClick={() => nav.go("contacts")}>{wheelText.apply}</button>
            )}
          </div>
        </div>
      </div>

      <div className={s.stage} {...r(2)}>
        <span className={s.pointer} aria-hidden="true" />
        <svg ref={wheelRef} className={s.wheel} viewBox="0 0 200 200" style={{ transitionDuration: `${SPIN_MS}ms` }} aria-hidden="true">
          {BONUSES.map((b, k) => {
            const a0 = k * SEG - SEG / 2, a1 = a0 + SEG;
            return (
              <g key={k}>
                <path d={`M100 100 L${pt(a0)} A100 100 0 0 1 ${pt(a1)} Z`} className={k % 2 ? s.segDark : s.segRed} />
                <text className={s.label} transform={`rotate(${k * SEG} 100 100) translate(100 40) rotate(-90)`}
                  textAnchor="middle" dominantBaseline="central">{b.short}</text>
              </g>
            );
          })}
          <circle cx="100" cy="100" r="14" className={s.hub} />
        </svg>
      </div>
    </div>
  );
}
