import { useEffect, useRef, useState, type CSSProperties, type ElementType } from "react";
import { finePointer, reducedMotion } from "../../lib/media";
import { webglSupported } from "../../gl/core";
import { register } from "./engine";
import { GlTextLayer } from "./glText";
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
  /**
   * Рисовать буквы на WebGL (glText.ts): появление из размытия без покадрового
   * blur. DOM-буквы остаются невидимыми — для раскладки, курсора и дикторов.
   * Без WebGL — обычная DOM-версия.
   */
  gl?: boolean;
}

/**
 * Текст, разбитый на буквы: буквы по очереди вылетают снизу из размытия
 * и расталкиваются курсором. Появление — CSS (внутренний span), реакция на
 * курсор — движок engine.ts (внешний span), поэтому они не мешают друг другу.
 */
export function WaveText({
  text, as: Tag = "p", className, play, live = true, strength = "normal",
  step = 32, delay = 250, lineClassNames, accentLast, gl: wantGl,
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<GlTextLayer | null>(null);
  const liveRef = useRef(live);
  liveRef.current = live;
  const [gl, setGl] = useState(() => !!wantGl && webglSupported());

  const lines = Array.isArray(text) ? text : [text];
  const label = lines.join(" ");
  const total = lines.join("").replace(/\s/g, "").length;

  // WebGL-слой букв
  useEffect(() => {
    if (!gl) return;
    const layer = new GlTextLayer(canvasRef.current!, ref.current!, { step, delay, reduced: reducedMotion() });
    if (!layer.ok) { layer.destroy(); setGl(false); return; }
    layerRef.current = layer;
    return () => { layer.destroy(); layerRef.current = null; };
  }, [gl, label, step, delay]);

  // курсор расталкивает буквы (в WebGL-режиме движок только считает, рисует слой)
  useEffect(() => {
    const el = ref.current;
    if (!el || !finePointer() || reducedMotion()) return;
    const layer = layerRef.current;
    const h = register(el, { ...STRENGTH[strength], isLive: () => liveRef.current, onFrame: layer?.invalidate });
    if (layer) layer.letters = h.letters;
    return h.unregister;
  }, [label, strength, gl]);

  /* появление: при play=true перезапускаем анимацию; при play=false буквы
     остаются видимыми (иначе они исчезали бы, пока экран плавно уходит) */
  useEffect(() => {
    const el = ref.current;
    if (!el || !play) return;
    if (layerRef.current) { layerRef.current.play(); return; }
    el.classList.remove(s.play);
    void el.offsetWidth; // перезапуск CSS-анимации
    el.classList.add(s.play);
  }, [play, gl]);

  let i = 0;
  const style = { "--step": `${step}ms`, "--d0": `${delay}ms` } as CSSProperties;
  return (
    <Tag ref={ref} className={`${s.wave} ${gl ? s.gl : ""} ${className ?? ""}`} style={style} aria-label={label}>
      {gl && <canvas ref={canvasRef} className={s.glCanvas} aria-hidden="true" />}
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
