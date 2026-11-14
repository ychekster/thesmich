import { useCallback, useEffect, useRef, useState } from "react";
import { card, cardBackText } from "../../content/card";
import { useInView } from "../../hooks/useInView";
import { finePointer, reducedMotion } from "../../lib/media";
import { webglSupported } from "../../gl/core";
import { GlCards } from "../../gl/cards/GlCards";
import type { CardLook } from "../../gl/cards/CardsRenderer";
import { buildFace, rasterBizCard } from "./faces";
import s from "./BizCard.module.css";

/*
 * Визитка студии — одна большая карта в пропорциях банковской (85.6 × 54;
 * на телефоне — вертикальная). Тот же движок, что у карт частых вопросов:
 * наклон к курсору, блик от неподвижного света, переворот по клику.
 * Параметры подстроены под размер: большой карте нужен меньший наклон и
 * более «дальняя» перспектива, иначе края искажаются.
 */
const ITEMS = [{ label: card.label, back: cardBackText }];

export const BIZ_LOOK: CardLook = {
  radius: (w, h) => 0.059 * Math.min(w, h),          // скругление банковской карты: 3.18 / 53.98 мм
  maxTilt: 7,
  perspective: 2600,
  shadow: (w, h) => {
    const big = Math.max(w, h);
    return { sigma: Math.max(24, big * 0.045), radius: 0.059 * Math.min(w, h) + 4, alpha: 0.85 * 0.7, k: Math.min(2.2, Math.max(1, big / 450)) };
  },
  pad: { x: 170, top: 90, bottom: 320 },
};

export function BizCard() {
  const [ref, inView] = useInView<HTMLDivElement>(0.35);
  const [gl, setGl] = useState(webglSupported);
  const onFail = useCallback(() => setGl(false), []);
  return (
    <section className={s.biz} aria-label={card.label}>
      <div ref={ref} className={s.stage}>
        {gl ? (
          <GlCards items={ITEMS} raster={rasterBizCard} look={BIZ_LOOK} className={s.grid} slotClassName={s.slot} dealt={inView} onFail={onFail} />
        ) : (
          <DomBizCard dealt={inView} />
        )}
      </div>
    </section>
  );
}

/** Запасной вариант без WebGL: CSS-3D, те же стороны (buildFace). */
function DomBizCard({ dealt }: { dealt: boolean }) {
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const f = buildFace(false), b = buildFace(true);
    frontRef.current!.replaceChildren(f);
    backRef.current!.replaceChildren(b);
  }, []);

  const hover = finePointer() && !reducedMotion();
  const tilt = (x: number, y: number) => {
    const el = tiltRef.current;
    if (el) el.style.transform = `rotateX(${(-y * 2 * BIZ_LOOK.maxTilt).toFixed(2)}deg) rotateY(${(x * 2 * BIZ_LOOK.maxTilt).toFixed(2)}deg)`;
  };

  return (
    <div className={`${s.grid} ${s.domDeal}`} data-dealt={dealt ? "" : undefined}>
      <div
        className={`${s.slot} ${s.domHit}`}
        role="button" tabIndex={0} aria-pressed={flipped} aria-label={card.label}
        onPointerMove={hover ? e => {
          const r = e.currentTarget.getBoundingClientRect();
          tilt((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
        } : undefined}
        onPointerLeave={hover ? () => tilt(0, 0) : undefined}
        onClick={() => setFlipped(v => !v)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFlipped(v => !v); } }}
      >
        <div ref={tiltRef} className={s.domTilt}>
          <div className={`${s.domFlip} ${flipped ? s.domFlipped : ""}`}>
            <div ref={frontRef} className={s.domSide} />
            <div ref={backRef} className={`${s.domSide} ${s.domBack}`} />
          </div>
        </div>
        <span className={s.srOnly} aria-live="polite">{flipped ? cardBackText : ""}</span>
      </div>
    </div>
  );
}
