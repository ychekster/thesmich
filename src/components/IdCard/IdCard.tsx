import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { idText, type Person } from "../../content/team";
import { finePointer, reducedMotion } from "../../lib/media";
import { webglSupported } from "../../gl/core";
import { GlCards } from "../../gl/cards/GlCards";
import type { CardLook } from "../../gl/cards/CardsRenderer";
import { rasterIdCard } from "./faces";
import d from "./DomIdCard.module.css";

/*
 * Удостоверение — одна большая карта на тот же движок, что карты FAQ:
 * наклон к курсору, блик от неподвижного света, переворот по клику.
 * Материал — матовый (matte: глянцевая полоса гаснет, зерно soft-touch).
 * Большой карте — меньший наклон и «дальняя» перспектива, иначе края искажаются.
 */
export const ID_LOOK: CardLook = {
  radius: (w, h) => 0.059 * Math.min(w, h),          // скругление ID-1: 3.18 / 53.98 мм
  maxTilt: 6,
  perspective: 2800,
  shadow: (w, h) => {
    const big = Math.max(w, h);
    return { sigma: Math.max(24, big * 0.045), radius: 0.059 * Math.min(w, h) + 4, alpha: 0.85 * 0.7, k: Math.min(2.2, Math.max(1, big / 450)) };
  },
  pad: { x: 170, top: 90, bottom: 320 },
  matte: 1,
};

interface Props {
  person: Person;
  /** Класс слота: размер карты задаёт страница. */
  slotClassName: string;
  backText: string;
}

export function IdCard({ person, slotClassName, backText }: Props) {
  const [gl, setGl] = useState(webglSupported);
  const onFail = useCallback(() => setGl(false), []);
  const items = useMemo(() => [{ label: idText.label(person), back: backText }], [person, backText]);
  const raster = useCallback(
    async (sizes: { w: number; h: number }[], dpr: number) => [await rasterIdCard(person, sizes[0], dpr)],
    [person],
  );
  // раздать карту после первого кадра — чтобы появление было видно
  const [dealt, setDealt] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDealt(true), 120); return () => clearTimeout(t); }, []);

  return gl ? (
    <GlCards items={items} raster={raster} look={ID_LOOK} className={d.grid} slotClassName={slotClassName} dealt={dealt} onFail={onFail} />
  ) : (
    <DomIdCard person={person} slotClassName={slotClassName} backText={backText} dealt={dealt} />
  );
}

/** Без WebGL: те же растры сторон (картинки) в CSS-3D. */
function DomIdCard({ person, slotClassName, backText, dealt }: Props & { dealt: boolean }) {
  const hitRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const hit = hitRef.current!;
    let id = 0, timer = 0;
    const draw = async () => {
      const n = ++id;
      const r = await rasterIdCard(person, { w: hit.offsetWidth, h: hit.offsetHeight }, Math.min(devicePixelRatio || 1, 2));
      if (n !== id) return;
      frontRef.current?.replaceChildren(r.front);
      backRef.current?.replaceChildren(r.back);
    };
    const ro = new ResizeObserver(() => { clearTimeout(timer); timer = window.setTimeout(draw, 120); });
    ro.observe(hit);
    return () => { ro.disconnect(); clearTimeout(timer); id++; };
  }, [person]);

  const hover = finePointer() && !reducedMotion();
  const tilt = (x: number, y: number) => {
    const el = tiltRef.current;
    if (el) el.style.transform = `rotateX(${(-y * 2 * ID_LOOK.maxTilt).toFixed(2)}deg) rotateY(${(x * 2 * ID_LOOK.maxTilt).toFixed(2)}deg)`;
  };

  return (
    <div className={`${d.grid} ${d.deal}`} data-dealt={dealt ? "" : undefined}>
      <div
        ref={hitRef}
        className={`${slotClassName} ${d.hit}`}
        role="button" tabIndex={0} aria-pressed={flipped} aria-label={idText.label(person)}
        onPointerMove={hover ? e => {
          const r = e.currentTarget.getBoundingClientRect();
          tilt((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
        } : undefined}
        onPointerLeave={hover ? () => tilt(0, 0) : undefined}
        onClick={() => setFlipped(v => !v)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFlipped(v => !v); } }}
      >
        <div ref={tiltRef} className={d.tilt}>
          <div className={`${d.flip} ${flipped ? d.flipped : ""}`}>
            <div ref={frontRef} className={`${d.side} ${d.front}`} />
            <div ref={backRef} className={`${d.side} ${d.back}`} />
          </div>
        </div>
        <span className={d.srOnly} aria-live="polite">{flipped ? backText : ""}</span>
      </div>
    </div>
  );
}
