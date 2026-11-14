import { useEffect, useRef, useState } from "react";
import { finePointer, reducedMotion } from "../../lib/media";
import type { FaqCard } from "../../types";
import { CardsRenderer } from "./gl/CardsRenderer";
import s from "./FaqCards.module.css";

interface Props {
  cards: FaqCard[];
  /** Блок попал в экран — раздать карты. */
  dealt: boolean;
  /** WebGL не завёлся — показать DOM-карты. */
  onFail: () => void;
}

/**
 * Карты на WebGL: холст рисует, невидимые слоты под ним принимают курсор,
 * клики и клавиатуру и озвучивают вопрос/ответ для экранных дикторов.
 */
export function GlCards({ cards, dealt, onFail }: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slotRefs = useRef<HTMLDivElement[]>([]);
  const rendererRef = useRef<CardsRenderer | null>(null);
  const [flipped, setFlipped] = useState<boolean[]>(() => cards.map(() => false));
  const flippedRef = useRef(flipped);

  useEffect(() => {
    const r = new CardsRenderer(canvasRef.current!, gridRef.current!, slotRefs.current, cards, {
      interactive: finePointer() && !reducedMotion(),
      reduced: reducedMotion(),
    });
    if (!r.ok) { r.destroy(); onFail(); return; }
    rendererRef.current = r;
    return () => { r.destroy(); rendererRef.current = null; };
  }, [cards, onFail]);

  useEffect(() => { if (dealt) rendererRef.current?.deal(); }, [dealt]);

  const toggle = (i: number) => {
    const next = flippedRef.current.map((v, j) => (j === i ? !v : v));
    flippedRef.current = next;
    rendererRef.current?.flip(i, next[i]);
    setFlipped(next);
  };

  return (
    <div ref={gridRef} className={`${s.cards} ${s.glCards}`}>
      <canvas ref={canvasRef} className={s.canvas} aria-hidden="true" />
      {cards.map((card, i) => (
        <div
          key={card.q}
          ref={el => { if (el) slotRefs.current[i] = el; }}
          className={s.slot}
          role="button"
          tabIndex={0}
          aria-pressed={flipped[i]}
          aria-label={card.q}
          onPointerMove={e => {
            const b = e.currentTarget.getBoundingClientRect();
            rendererRef.current?.pointer(i, (e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height);
          }}
          onPointerLeave={() => rendererRef.current?.leave(i)}
          onPointerDown={e => { if (e.button === 0) rendererRef.current?.press(i, true); }}
          onPointerUp={() => rendererRef.current?.press(i, false)}
          onClick={() => toggle(i)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(i); } }}
        >
          {/* ответ для экранных дикторов, когда карта открыта */}
          <span className={s.srOnly} aria-live="polite">{flipped[i] ? card.a : ""}</span>
        </div>
      ))}
    </div>
  );
}
