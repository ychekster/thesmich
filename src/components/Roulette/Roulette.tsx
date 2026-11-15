import { useLayoutEffect, useRef, useState } from "react";
import { BONUSES, rouletteText } from "../../content/roulette";
import { reducedMotion } from "../../lib/media";
import { WaveText } from "../WaveText/WaveText";
import { reveal } from "../Pager/Pager";
import s from "./Roulette.module.css";

/*
 * Рулетка-лента, как открытие кейса в CS:GO: длинная лента плиток бонусов едет
 * под неподвижной стрелкой по центру и долго тормозит. Лента сдвигается одним
 * CSS-переходом transform (видеокарта, без покадрового React).
 *
 * Выигрыш выбирается заранее (равные шансы) и кладётся в плитку WIN; лента
 * останавливается так, что под стрелкой — эта плитка, со случайным сдвигом
 * внутри неё (живее). Следующая прокрутка начинается без скачка: новая лента
 * начинается с тех же плиток, что сейчас видны, и встаёт на то же место.
 */

const LEN = 60;   // плиток в ленте
const WIN = 52;   // номер плитки-выигрыша
const KEEP = 6;   // столько плиток слева от стрелки переносим в новую ленту
const SPIN_MS = 6500;

const rnd = (n: number) => Math.floor(Math.random() * n);
const randomStrip = (len: number) => Array.from({ length: len }, () => rnd(BONUSES.length));

interface Props {
  live: boolean;
  onBonus: (full: string) => void;
  onApply: () => void;
}

export function Roulette({ live, onBonus, onApply }: Props) {
  const winRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [strip, setStrip] = useState(() => randomStrip(LEN));
  // какая плитка сейчас под стрелкой и сдвиг от её центра (доля ширины плитки)
  const at = useRef({ i: KEEP, off: 0 });
  const plan = useRef<{ from: { i: number; off: number }; to: { i: number; off: number } } | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState<number | null>(null);

  /** Сдвиг ленты, при котором под стрелкой точка плитки i со сдвигом off. */
  const shift = (i: number, off: number) => {
    const track = trackRef.current!, items = track.children;
    const first = items[0] as HTMLElement, second = items[1] as HTMLElement;
    const step = second.offsetLeft - first.offsetLeft;
    const center = winRef.current!.clientWidth / 2;
    return center - (first.offsetLeft + i * step + first.offsetWidth * (0.5 + off));
  };
  const place = (i: number, off: number) => {
    trackRef.current!.style.transform = `translate3d(${shift(i, off).toFixed(1)}px, 0, 0)`;
  };

  // после смены ленты: встать без анимации на прежнее место, затем поехать
  useLayoutEffect(() => {
    const track = trackRef.current!;
    const p = plan.current;
    if (!p) { place(at.current.i, at.current.off); return; }
    plan.current = null;
    track.style.transition = "none";
    place(p.from.i, p.from.off);
    void track.offsetWidth; // зафиксировать стартовое положение
    track.style.transition = `transform ${reducedMotion() ? 400 : SPIN_MS}ms cubic-bezier(.12, .62, .1, 1)`;
    place(p.to.i, p.to.off);
    at.current = p.to;
  }, [strip]);

  // на ресайз — без анимации на текущее место
  useLayoutEffect(() => {
    const ro = new ResizeObserver(() => {
      if (spinning) return;
      trackRef.current!.style.transition = "none";
      place(at.current.i, at.current.off);
    });
    ro.observe(winRef.current!);
    return () => ro.disconnect();
  }, [spinning]);

  const spin = () => {
    if (spinning) return;
    const prize = rnd(BONUSES.length);
    const next = [...strip.slice(at.current.i - KEEP, at.current.i + KEEP), ...randomStrip(LEN - 2 * KEEP)];
    next[WIN] = prize;
    plan.current = { from: { i: KEEP, off: at.current.off }, to: { i: WIN, off: (Math.random() - 0.5) * 0.8 } };
    setWon(null);
    setSpinning(true);
    setStrip(next);
    const track = trackRef.current!;
    const done = (e: TransitionEvent) => {
      if (e.target !== track) return;
      track.removeEventListener("transitionend", done);
      setSpinning(false);
      setWon(prize);
      onBonus(BONUSES[prize].full);
    };
    track.addEventListener("transitionend", done);
  };

  return (
    <div className={s.roulette}>
      <div className={s.head}>
        <div {...reveal(1)}>
          <WaveText as="h2" text={rouletteText.title} className={s.title} play={live} live={live} step={16} delay={120} />
        </div>
        <p className={s.lead} {...reveal(2)}>{rouletteText.lead}</p>
      </div>

      <div ref={winRef} className={s.window} aria-hidden="true" {...reveal(3)}>
        <div ref={trackRef} className={`${s.track} ${spinning ? s.spinning : ""}`}>
          {strip.map((b, i) => (
            <div key={i} className={`${s.item} ${s["t" + BONUSES[b].tier]} ${won !== null && i === WIN ? s.won : ""}`}>
              {BONUSES[b].short.map(line => <span key={line}>{line}</span>)}
            </div>
          ))}
        </div>
        <i className={s.marker} />
      </div>

      <div className={s.panel} aria-live="polite" {...reveal(5)}>
        <div className={`${s.result} ${won !== null ? s.shown : ""}`}>
          <p className={s.resLbl}>{rouletteText.result}</p>
          <p className={s.resVal}>{won !== null ? BONUSES[won].full : " "}</p>
        </div>
        <div className={s.actions}>
          {won === null ? (
            <button className={s.primary} type="button" onClick={spin} disabled={spinning}>{rouletteText.spin}</button>
          ) : (
            <>
              <button className={s.primary} type="button" onClick={onApply}>{rouletteText.apply}</button>
              <button className={s.secondary} type="button" onClick={spin}>{rouletteText.again}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
