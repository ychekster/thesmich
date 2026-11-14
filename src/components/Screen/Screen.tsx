import { forwardRef, type ReactNode, type UIEventHandler } from "react";
import s from "./Screen.module.css";

export type ScreenState = "active" | "past" | "future";

interface Props {
  state: ScreenState;
  children: ReactNode;
  className?: string;
  /** Экран листается (главная), а не центрируется по высоте. */
  scroll?: boolean;
  onScroll?: UIEventHandler<HTMLElement>;
}

/**
 * Экран во весь вьюпорт. Все экраны отрисованы сразу и лежат друг на друге;
 * переход между ними — только opacity и transform (рисует видеокарта, без
 * пересчёта раскладки), поэтому смена экранов плавная.
 */
export const Screen = forwardRef<HTMLElement, Props>(function Screen(
  { state, children, className, scroll, onScroll }, ref,
) {
  return (
    <section
      ref={ref}
      className={`${s.screen} ${s[state]} ${scroll ? s.scroll : ""} ${className ?? ""}`}
      aria-hidden={state !== "active"}
      onScroll={onScroll}
    >
      <div className={s.inner}>{children}</div>
    </section>
  );
});
