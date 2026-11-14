import { useCallback, useState } from "react";
import { FAQ } from "../../content/faq";
import { useInView } from "../../hooks/useInView";
import { PHONE, useMedia } from "../../hooks/useMedia";
import { webglSupported } from "../../gl/core";
import { WaveText } from "../WaveText/WaveText";
import { FlipCard } from "./FlipCard";
import { GlCards } from "../../gl/cards/GlCards";
import { FAQ_LOOK, type CardLook } from "../../gl/cards/CardsRenderer";
import { rasterFaces } from "./gl/faces";
import s from "./FaqCards.module.css";

const ITEMS = FAQ.map(c => ({ label: c.q, back: c.a }));
const raster = (sizes: { w: number; h: number }[], dpr: number) => rasterFaces(FAQ, sizes, dpr);

/* Телефон: карты в горизонтальной ленте. Холст лежит внутри ленты и не должен
   выходить за неё — поля холста = вертикальные поля ленты (FaqCards.module.css,
   .rail: 40px сверху, 150px снизу), по бокам полей нет: край даёт сама лента. */
const PHONE_LOOK: CardLook = { ...FAQ_LOOK, pad: { x: 0, top: 40, bottom: 150 } };

/**
 * Частые вопросы: заголовок и 4 карты. Карты переворачиваются независимо.
 * Основной вариант — WebGL (GlCards); если его нет или видеокарта программная,
 * — прежние DOM-карты (FlipCard), выглядят так же.
 * На телефоне карты те же (5:7) и листаются пальцем по горизонтали, как
 * скриншоты в App Store: лента со снапом (.rail в css).
 */
export function FaqCards({ live }: { live: boolean }) {
  const [headRef, headIn] = useInView<HTMLDivElement>(0.4);
  const [cardsRef, cardsIn] = useInView<HTMLDivElement>(0.25);
  const [gl, setGl] = useState(webglSupported);
  const onFail = useCallback(() => setGl(false), []);
  const phone = useMedia(PHONE);
  return (
    <section className={s.faq} id="faq">
      <div ref={headRef}>
        <WaveText as="h2" text="Частые вопросы" className={s.title} play={headIn} live={live} step={16} delay={120} />
      </div>
      <div ref={cardsRef} className={s.rail}>
        {gl ? (
          <GlCards items={ITEMS} raster={raster} look={phone ? PHONE_LOOK : FAQ_LOOK} className={s.cards} slotClassName={s.slot} dealt={cardsIn} onFail={onFail} />
        ) : (
          <div className={s.cards}>
            {FAQ.map((card, i) => <FlipCard key={card.q} card={card} index={i} dealt={cardsIn} />)}
          </div>
        )}
      </div>
    </section>
  );
}
