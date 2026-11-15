import type { ReactNode } from "react";
import s from "./Screen.module.css";

export type ScreenState = "active" | "past" | "future";

interface Props {
  state: ScreenState;
  children: ReactNode;
  className?: string;
  /** Без полей и центровки: экран целиком отдан детям (главная — секции Pager). */
  full?: boolean;
}

/**
 * Экран во весь вьюпорт. Все экраны отрисованы сразу и лежат друг на друге;
 * переход между ними — только opacity и transform (рисует видеокарта, без
 * пересчёта раскладки), поэтому смена экранов плавная.
 */
export function Screen({ state, children, className, full }: Props) {
  return (
    <section
      className={`${s.screen} ${s[state]} ${full ? s.full : ""} ${className ?? ""}`}
      aria-hidden={state !== "active"}
    >
      {full ? children : <div className={s.inner}>{children}</div>}
    </section>
  );
}
