import { useEffect, useRef, useState } from "react";
import { finePointer, reducedMotion } from "../../lib/media";
import { CardsRenderer, type CardLook, type RasterFn } from "./CardsRenderer";
import s from "./GlCards.module.css";

export interface GlCardItem {
  /** Подпись кнопки для экранных дикторов (лицевая сторона). */
  label: string;
  /** Что зачитать, когда карта перевёрнута (оборот). */
  back: string;
}

interface Props {
  items: GlCardItem[];
  /** Растр сторон под размеры карт (см. gl/raster.ts). Должен быть стабильным (useCallback/модуль). */
  raster: RasterFn;
  look?: CardLook;
  /** Классы сетки и слота: раскладку и размер карт задаёт CSS компонента. */
  className?: string;
  slotClassName?: string;
  /** Блок попал в экран — раздать карты. */
  dealt: boolean;
  /** WebGL не завёлся — показать DOM-карты. */
  onFail: () => void;
}

/**
 * Карты на WebGL: холст рисует, невидимые слоты под ним принимают курсор,
 * клики и клавиатуру и озвучивают стороны для экранных дикторов.
 */
export function GlCards({ items, raster, look, className, slotClassName, dealt, onFail }: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slotRefs = useRef<HTMLDivElement[]>([]);
  const rendererRef = useRef<CardsRenderer | null>(null);
  const [flipped, setFlipped] = useState<boolean[]>(() => items.map(() => false));
  const flippedRef = useRef(flipped);
  const dealtRef = useRef(dealt);
  dealtRef.current = dealt;

  useEffect(() => {
    const r = new CardsRenderer(canvasRef.current!, gridRef.current!, slotRefs.current, raster, {
      interactive: finePointer() && !reducedMotion(),
      reduced: reducedMotion(),
      look,
    });
    if (!r.ok) { r.destroy(); onFail(); return; }
    rendererRef.current = r;
    // карты, перевёрнутые до пересоздания (StrictMode), — в том же положении
    flippedRef.current.forEach((f, i) => f && r.flip(i, true, -1e9));
    if (dealtRef.current) r.deal();
    return () => { r.destroy(); rendererRef.current = null; };
  }, [raster, look, onFail]);

  useEffect(() => { if (dealt) rendererRef.current?.deal(); }, [dealt]);

  const toggle = (i: number) => {
    const next = flippedRef.current.map((v, j) => (j === i ? !v : v));
    flippedRef.current = next;
    rendererRef.current?.flip(i, next[i]);
    setFlipped(next);
  };

  return (
    <div ref={gridRef} className={`${s.grid} ${className ?? ""}`}>
      <canvas ref={canvasRef} className={s.canvas} aria-hidden="true" />
      {items.map((item, i) => (
        <div
          key={item.label}
          ref={el => { if (el) slotRefs.current[i] = el; }}
          className={`${s.slot} ${slotClassName ?? ""}`}
          role="button"
          tabIndex={0}
          aria-pressed={flipped[i]}
          aria-label={item.label}
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
          {/* оборот для экранных дикторов, когда карта открыта */}
          <span className={s.srOnly} aria-live="polite">{flipped[i] ? item.back : ""}</span>
        </div>
      ))}
    </div>
  );
}
