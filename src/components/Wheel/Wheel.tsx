import { useRef, useState } from "react";
import { BONUSES, wheelText } from "../../content/wheel";
import { useInView } from "../../hooks/useInView";
import { WaveText } from "../WaveText/WaveText";
import s from "./Wheel.module.css";

/*
 * Рулетка с бонусом. Колесо — статичный SVG, крутится одним CSS-переходом
 * transform (видеокарта, без покадрового React): быстрый старт и долгое
 * плавное торможение. Результат выбирается заранее (равные шансы), колесо
 * докручивается так, чтобы под стрелкой оказалась середина сектора (с
 * небольшим разбросом — выглядит живее). Стрелка — сверху.
 */

const N = BONUSES.length;
const SEG = 360 / N;
const TURNS = 6;          // полных оборотов за прокрутку
const R = 96;             // радиус колеса в единицах viewBox (−100…100)

/** Точка на окружности: угол от 12 часов по часовой стрелке. */
const at = (deg: number, r: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [r * Math.cos(a), r * Math.sin(a)] as const;
};

function sector(i: number) {
  const [x0, y0] = at(i * SEG, R), [x1, y1] = at((i + 1) * SEG, R);
  return `M0 0 L${x0.toFixed(3)} ${y0.toFixed(3)} A${R} ${R} 0 0 1 ${x1.toFixed(3)} ${y1.toFixed(3)}Z`;
}

interface Props {
  /** Главная активна — заголовок реагирует на курсор. */
  live: boolean;
  /** Выпал бонус (последний — уходит в заявку). */
  onBonus: (full: string) => void;
  /** «Оставить заявку». */
  onApply: () => void;
}

export function Wheel({ live, onBonus, onApply }: Props) {
  const [headRef, headIn] = useInView<HTMLDivElement>(0.4);
  const wheelRef = useRef<SVGGElement>(null);
  const rot = useRef(0);
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState<number | null>(null);

  const spin = () => {
    const el = wheelRef.current;
    if (!el || spinning) return;
    const i = Math.floor(Math.random() * N);
    const jitter = (Math.random() - 0.5) * SEG * 0.6;
    // под стрелкой (0°) должна оказаться середина сектора i: поворот ≡ −центр (mod 360)
    const target = (((-(i + 0.5) * SEG + jitter) % 360) + 360) % 360;
    const cur = ((rot.current % 360) + 360) % 360;
    rot.current += TURNS * 360 + ((target - cur + 360) % 360);
    setSpinning(true);
    setWon(null);
    el.style.transform = `rotate(${rot.current}deg)`;
    const done = () => {
      el.removeEventListener("transitionend", done);
      setSpinning(false);
      setWon(i);
      onBonus(BONUSES[i].full);
    };
    el.addEventListener("transitionend", done);
  };

  return (
    <section className={s.wheel} id="wheel" aria-label={wheelText.title}>
      <div ref={headRef} className={s.head}>
        <WaveText as="h2" text={wheelText.title} className={s.title} play={headIn} live={live} step={16} delay={120} />
        <p className={s.lead}>{wheelText.lead}</p>
      </div>

      <div className={s.body}>
        <div className={s.stage}>
          <svg className={s.svg} viewBox="-100 -100 200 200" aria-hidden="true">
            <g ref={wheelRef} className={`${s.rotor} ${spinning ? s.spinning : ""}`}>
              {BONUSES.map((b, i) => {
                const c = (i + 0.5) * SEG;
                // левая половина колеса: разворачиваем подпись на 180°, иначе она вверх ногами
                const flip = c > 180;
                return (
                  <g key={b.full}>
                    <path d={sector(i)} className={i % 2 ? s.segB : s.segA} />
                    {/* подпись вдоль радиуса, у обода */}
                    <g transform={`rotate(${flip ? c + 90 : c - 90})`}>
                      {b.short.map((line, k) => (
                        <text key={k} x={flip ? -(R - 9) : R - 9} y={(k - (b.short.length - 1) / 2) * 8.4}
                          className={s.label} textAnchor={flip ? "start" : "end"}>{line}</text>
                      ))}
                    </g>
                  </g>
                );
              })}
              {/* огоньки по ободу — как у рулетки */}
              {Array.from({ length: N * 3 }, (_, k) => {
                const [x, y] = at(k * (SEG / 3), R - 3);
                return <circle key={k} cx={x} cy={y} r={k % 3 ? 0.7 : 1.1} className={s.bulb} />;
              })}
            </g>
            <circle r={R} className={s.rim} />
            <circle r={17} className={s.hub} />
            <circle r={3.4} className={s.hubDot} />
          </svg>
          {/* стрелка сверху */}
          <svg className={s.pointer} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22 3 4h18z" /></svg>
        </div>

        <div className={s.panel} aria-live="polite">
          <div className={`${s.result} ${won !== null ? s.shown : ""}`}>
            <p className={s.resLbl}>{wheelText.result}</p>
            <p className={s.resVal}>{won !== null ? BONUSES[won].full : " "}</p>
          </div>
          <div className={s.actions}>
            {won === null ? (
              <button className={s.primary} type="button" onClick={spin} disabled={spinning}>{wheelText.spin}</button>
            ) : (
              <>
                <button className={s.primary} type="button" onClick={onApply}>{wheelText.apply}</button>
                <button className={s.secondary} type="button" onClick={spin}>{wheelText.again}</button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
