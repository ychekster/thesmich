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
 * Текст, разбитый на буквы: буквы по очереди вылетают снизу (без размытия — оно тормозило)
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

  /* появление: play=true — заголовок собирается по словам (заново при каждом заходе
     в секцию); play=false после сборки — разбирается: обратная перемотка, последнее
     слово уходит первым (секция уезжает, Pager) */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (layerRef.current) { if (play) layerRef.current.play(); return; }
    if (!play) {
      if (el.classList.contains(s.play)) { el.classList.remove(s.play); el.classList.add(s.out); }
      return;
    }
    // перезапуск CSS-анимации через кадр, а не через el.offsetWidth: тот
    // пересчитывал раскладку всей страницы прямо в момент жеста (фриз)
    el.classList.remove(s.play, s.out);
    const raf = requestAnimationFrame(() => el.classList.add(s.play));
    return () => cancelAnimationFrame(raf);
  }, [play, gl]);

  let i = 0, w = 0;
  const words = lines.join(" ").split(" ").filter(Boolean).length;
  const style = { "--step": `${step}ms`, "--d0": `${delay}ms`, "--wn": words } as CSSProperties;
  return (
    <Tag ref={ref} className={`${s.wave} ${gl ? s.gl : ""} ${className ?? ""}`} style={style} aria-label={label}>
      {gl && <canvas ref={canvasRef} className={s.glCanvas} aria-hidden="true" />}
      {lines.map((line, li) => (
        <span key={li} className={`${Array.isArray(text) ? s.line : ""} ${lineClassNames?.[li] ?? ""}`} aria-hidden="true">
          {line.split(" ").map((word, wi, words) => (
            <span key={wi}>
              {/* сборка/разборка — по словам (слово — один движущийся объект), а буквы
                  внутри неподвижны и оживают, только когда их расталкивает курсор */}
              <span className={s.word} style={{ "--w": w++ } as CSSProperties}>
                {[...word].map((c, ci) => {
                  const n = i++;
                  const last = accentLast && n === total - 1;
                  return (
                    <span key={ci} data-ch className={`${s.ch} ${last ? s.accent : ""}`}>
                      <span className={s.in}>{c}</span>
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
