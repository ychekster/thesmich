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
  /** Наклон пальцем: зажал и ведёшь — как курсором; экран под картой не листается. */
  touchTilt?: boolean;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const TAP_SLOP = 10; // px: дальше — это проводка пальцем, а не тап (не переворачиваем)

/**
 * Карты на WebGL: холст рисует, невидимые слоты под ним принимают курсор,
 * клики и клавиатуру и озвучивают стороны для экранных дикторов.
 */
export function GlCards({ items, raster, look, className, slotClassName, dealt, onFail, touchTilt = false }: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slotRefs = useRef<HTMLDivElement[]>([]);
  const rendererRef = useRef<CardsRenderer | null>(null);
  const [flipped, setFlipped] = useState<boolean[]>(() => items.map(() => false));
  const flippedRef = useRef(flipped);
  const dealtRef = useRef(dealt);
  dealtRef.current = dealt;
  const touchRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const draggedRef = useRef(false); // последний жест был проводкой — клик не переворачивает

  useEffect(() => {
    const r = new CardsRenderer(canvasRef.current!, gridRef.current!, slotRefs.current, raster, {
      interactive: finePointer() && !reducedMotion(),
      reduced: reducedMotion(),
      look,
      touch: touchTilt,
      onError: onFail,
    });
    if (!r.ok) { r.destroy(); onFail(); return; }
    rendererRef.current = r;
    // карты, перевёрнутые до пересоздания (StrictMode), — в том же положении
    flippedRef.current.forEach((f, i) => f && r.flip(i, true, -1e9));
    if (dealtRef.current) r.deal();
    return () => { r.destroy(); rendererRef.current = null; };
  }, [raster, look, onFail, touchTilt]);

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
          className={`${s.slot} ${touchTilt ? s.touch : ""} ${slotClassName ?? ""}`}
          role="button"
          tabIndex={0}
          aria-pressed={flipped[i]}
          aria-label={item.label}
          onPointerMove={e => {
            const b = e.currentTarget.getBoundingClientRect();
            const px = (e.clientX - b.left) / b.width, py = (e.clientY - b.top) / b.height;
            if (e.pointerType !== "touch") return rendererRef.current?.pointer(i, px, py);
            const t = touchRef.current;
            if (!touchTilt || !t) return;
            if (Math.hypot(e.clientX - t.x, e.clientY - t.y) > TAP_SLOP) t.moved = true;
            // палец может уйти за край карты (касание «держит» слот) — наклон не больше максимума
            rendererRef.current?.pointer(i, clamp01(px), clamp01(py), true);
          }}
          onPointerLeave={e => { if (e.pointerType !== "touch") rendererRef.current?.leave(i); }}
          onPointerDown={e => {
            if (e.button !== 0) return;
            const touch = e.pointerType === "touch";
            draggedRef.current = false;
            if (touch) {
              if (!touchTilt) return;
              touchRef.current = { x: e.clientX, y: e.clientY, moved: false };
              const b = e.currentTarget.getBoundingClientRect();
              rendererRef.current?.pointer(i, (e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height, true);
            }
            rendererRef.current?.press(i, true, touch);
          }}
          onPointerUp={e => {
            if (e.pointerType === "touch") {
              draggedRef.current = !!touchRef.current?.moved;
              touchRef.current = null;
              rendererRef.current?.leave(i); // отпустил — карта мягко возвращается
            } else rendererRef.current?.press(i, false);
          }}
          onPointerCancel={e => {
            if (e.pointerType !== "touch") return;
            touchRef.current = null;
            rendererRef.current?.leave(i);
          }}
          onClick={() => {
            if (draggedRef.current) { draggedRef.current = false; return; }
            toggle(i);
          }}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(i); } }}
        >
          {/* оборот для экранных дикторов, когда карта открыта */}
          <span className={s.srOnly} aria-live="polite">{flipped[i] ? item.back : ""}</span>
        </div>
      ))}
    </div>
  );
}
