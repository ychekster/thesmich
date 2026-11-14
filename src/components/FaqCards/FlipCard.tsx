import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { finePointer, reducedMotion } from "../../lib/media";
import type { FaqCard } from "../../types";
import s from "./FaqCards.module.css";

/*
 * Наклон — пружина без перелёта (почти критическое затухание), чтобы карта
 * не раскачивалась. Переворот — CSS-переход (см. .flipped в css): он
 * детерминированный и не «проскакивает» за 180°.
 */
const TILT = { stiffness: 170, damping: 26, mass: 0.7 };
const MAX_TILT = 10; // градусов

interface Props {
  card: FaqCard;
  index: number;
  dealt: boolean;
}

/**
 * Карта с вопросом. Наведение: карта «продавливается» к курсору. Свет падает
 * из неподвижного источника сверху-слева, поэтому блик и тень смещаются от
 * наклона карты, а не бегут за курсором. Все покадровые изменения — только
 * transform и opacity заранее отрисованных слоёв: без перерисовки.
 */
export function FlipCard({ card, index, dealt }: Props) {
  const [flipped, setFlipped] = useState(false);
  const interactive = useRef(finePointer() && !reducedMotion());

  // цель наклона, градусы; пружины сглаживают
  const tx = useMotionValue(0);
  const ty = useMotionValue(0);
  const rotateX = useSpring(tx, TILT);
  const rotateY = useSpring(ty, TILT);
  const scale = useSpring(1, TILT);

  // блик: сдвигается против наклона и ярчеет, когда карта повёрнута к свету (вверх-влево)
  const specX = useTransform(rotateY, v => `${-v * 2.2}%`);
  const specY = useTransform(rotateX, v => `${v * 2.2}%`);
  const specO = useTransform([rotateX, rotateY], ([x, y]: number[]) => clamp(0.55 + (x - y) * 0.045, 0.25, 1));
  // на обороте карта зеркальна по горизонтали
  const specXBack = useTransform(rotateY, v => `${v * 2.2}%`);
  const specOBack = useTransform([rotateX, rotateY], ([x, y]: number[]) => clamp(0.55 + (x + y) * 0.045, 0.25, 1));
  // тень падает вниз-вправо от света и уходит дальше при наклоне
  const shadowX = useTransform(rotateY, v => v * -1.6);
  const shadowY = useTransform(rotateX, v => 22 + v * 1.6);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    // точка под курсором уходит вглубь
    tx.set(-py * 2 * MAX_TILT);
    ty.set(px * 2 * MAX_TILT);
  };
  const reset = () => { tx.set(0); ty.set(0); scale.set(1); };
  const toggle = () => setFlipped(f => !f);

  const red = card.suit === "♥" || card.suit === "♦";
  const corners = (
    <>
      <span className={`${s.suit} ${red ? s.red : ""}`} aria-hidden="true">{card.suit}</span>
      <span className={`${s.suit} ${s.br} ${red ? s.red : ""}`} aria-hidden="true">{card.suit}</span>
    </>
  );

  return (
    <div className={s.deal} style={{ "--n": index } as React.CSSProperties} data-dealt={dealt || undefined}>
      <div
        className={`${s.hit} ${flipped ? s.flipped : ""}`}
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label={card.q}
        onPointerMove={onMove}
        onPointerLeave={reset}
        onPointerDown={e => { if (e.button === 0 && interactive.current) scale.set(0.97); }}
        onPointerUp={() => scale.set(1)}
        onClick={toggle}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}
      >
        <motion.span className={s.shadow} style={{ x: shadowX, y: shadowY }} aria-hidden="true" />
        <motion.div className={s.tilt} style={{ rotateX, rotateY, scale }}>
          <div className={s.flip}>
            <div className={`${s.face} ${s.front}`}>
              <motion.span className={s.spec} style={{ x: specX, y: specY, opacity: specO }} aria-hidden="true" />
              {corners}
              <p className={s.q}>{card.q}</p>
            </div>
            <div className={`${s.face} ${s.back}`}>
              <motion.span className={`${s.spec} ${s.specBack}`} style={{ x: specXBack, y: specY, opacity: specOBack }} aria-hidden="true" />
              {corners}
              <p className={s.q2}>{card.q}</p>
              <p className={s.a}>{card.a}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
