import { FAQ } from "../../content/faq";
import { useInView } from "../../hooks/useInView";
import { WaveText } from "../WaveText/WaveText";
import { FlipCard } from "./FlipCard";
import s from "./FaqCards.module.css";

/** Частые вопросы: заголовок и 4 карты. Карты переворачиваются независимо. */
export function FaqCards({ live }: { live: boolean }) {
  const [headRef, headIn] = useInView<HTMLDivElement>(0.4);
  const [cardsRef, cardsIn] = useInView<HTMLDivElement>(0.25);
  return (
    <section className={s.faq} id="faq">
      <div ref={headRef}>
        <WaveText as="h2" text="Частые вопросы" className={s.title} play={headIn} live={live} step={16} delay={120} />
      </div>
      <div ref={cardsRef} className={s.cards}>
        {FAQ.map((card, i) => <FlipCard key={card.q} card={card} index={i} dealt={cardsIn} />)}
      </div>
    </section>
  );
}
