import { useCallback, useState } from "react";
import { FAQ } from "../../content/faq";
import { useInView } from "../../hooks/useInView";
import { webglSupported } from "../../gl/core";
import { WaveText } from "../WaveText/WaveText";
import { FlipCard } from "./FlipCard";
import { GlCards } from "./GlCards";
import s from "./FaqCards.module.css";

/**
 * Частые вопросы: заголовок и 4 карты. Карты переворачиваются независимо.
 * Основной вариант — WebGL (GlCards); если его нет или видеокарта программная,
 * — прежние DOM-карты (FlipCard), выглядят так же.
 */
export function FaqCards({ live }: { live: boolean }) {
  const [headRef, headIn] = useInView<HTMLDivElement>(0.4);
  const [cardsRef, cardsIn] = useInView<HTMLDivElement>(0.25);
  const [gl, setGl] = useState(webglSupported);
  const onFail = useCallback(() => setGl(false), []);
  return (
    <section className={s.faq} id="faq">
      <div ref={headRef}>
        <WaveText as="h2" text="Частые вопросы" className={s.title} play={headIn} live={live} step={16} delay={120} />
      </div>
      <div ref={cardsRef}>
        {gl ? (
          <GlCards cards={FAQ} dealt={cardsIn} onFail={onFail} />
        ) : (
          <div className={s.cards}>
            {FAQ.map((card, i) => <FlipCard key={card.q} card={card} index={i} dealt={cardsIn} />)}
          </div>
        )}
      </div>
    </section>
  );
}
