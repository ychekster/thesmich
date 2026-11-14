import { useEffect, useRef, type CSSProperties, type ElementType } from "react";
import { finePointer, reducedMotion } from "../../lib/media";
import { register } from "./engine";
import s from "./WaveText.module.css";

/** Сила реакции на курсор: под размер шрифта. */
const STRENGTH = {
  normal: { radius: 190, push: 52 },  // заголовки вопросов
  big: { radius: 230, push: 74 },     // главный заголовок
  huge: { radius: 320, push: 120 },   // огромный логотип в футере
} as const;

interface Props {
  /** Строка — переносы по ширине; массив — каждая строка с новой линии. */
  text: string | string[];
  as?: ElementType;
  className?: string;
  /** Запустить появление букв. Смена false → true проигрывает его заново. */
  play: boolean;
  /** Реагировать на курсор (например, только на активном экране). */
  live?: boolean;
  strength?: keyof typeof STRENGTH;
  /** Задержка между буквами и до первой буквы, мс. */
  step?: number;
  delay?: number;
  /** Классы для строк по порядку (например, разный цвет строк). */
  lineClassNames?: string[];
  /** Подсветить последний символ (точку в логотипе). */
  accentLast?: boolean;
}

/**
 * Текст, разбитый на буквы: буквы по очереди вылетают снизу из размытия
 * и расталкиваются курсором. Появление — CSS (внутренний span), реакция на
 * курсор — движок engine.ts (внешний span), поэтому они не мешают друг другу.
 */
export function WaveText({
  text, as: Tag = "p", className, play, live = true, strength = "normal",
  step = 32, delay = 250, lineClassNames, accentLast,
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const liveRef = useRef(live);
  liveRef.current = live;

  const lines = Array.isArray(text) ? text : [text];
  const label = lines.join(" ");
  const total = lines.join("").replace(/\s/g, "").length;

  useEffect(() => {
    const el = ref.current;
    if (!el || !finePointer() || reducedMotion()) return;
    const h = register(el, { ...STRENGTH[strength], isLive: () => liveRef.current });
    return h.unregister;
  }, [label, strength]);

  /* появление: при play=true перезапускаем анимацию; при play=false буквы
     остаются видимыми (иначе они исчезали бы, пока экран плавно уходит) */
  useEffect(() => {
    const el = ref.current;
    if (!el || !play) return;
    el.classList.remove(s.play);
    void el.offsetWidth; // перезапуск CSS-анимации
    el.classList.add(s.play);
  }, [play]);

  let i = 0;
  const style = { "--step": `${step}ms`, "--d0": `${delay}ms` } as CSSProperties;
  return (
    <Tag ref={ref} className={`${s.wave} ${className ?? ""}`} style={style} aria-label={label}>
      {lines.map((line, li) => (
        <span key={li} className={`${Array.isArray(text) ? s.line : ""} ${lineClassNames?.[li] ?? ""}`} aria-hidden="true">
          {line.split(" ").map((word, wi, words) => (
            <span key={wi}>
              <span className={s.word}>
                {[...word].map((c, ci) => {
                  const n = i++;
                  const last = accentLast && n === total - 1;
                  return (
                    <span key={ci} data-ch className={`${s.ch} ${last ? s.accent : ""}`}>
                      <span className={s.in} style={{ "--i": n } as CSSProperties}>{c}</span>
                    </span>
                  );
                })}
              </span>
              {wi < words.length - 1 ? " " : null}
            </span>
          ))}
        </span>
      ))}
    </Tag>
  );
}
