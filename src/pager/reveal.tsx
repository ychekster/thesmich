import type { ElementType } from "react";
import s from "./Pager.module.css";

/**
 * Элемент сборки секции: появляется снизу из прозрачности; i — номер в очереди
 * (0 — первым). При уходе из секции — та же сборка в обратной перемотке.
 * Анимирует движок (engine.ts). Не ставить на элемент со своим transform.
 */
export const r = (i: number) => ({ "data-r": i });

interface LinesProps {
  lines: readonly string[];
  as?: ElementType;
  className?: string;
  /** Номер в очереди первой строки; следующие — по порядку. */
  from?: number;
}

/** Заголовок, у которого каждая строка выезжает из-под своей маски. */
export function Lines({ lines, as: Tag = "h2", className, from = 0 }: LinesProps) {
  return (
    <Tag className={className}>
      {lines.map((l, k) => (
        <span key={k} className={s.mask}>
          <span className={s.line} data-r={from + k} data-r-line="">{l}</span>
        </span>
      ))}
    </Tag>
  );
}
