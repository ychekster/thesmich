import { memo, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createEngine, type EngineSection } from "./engine";
import { bindInput } from "./input";
import { nav } from "./nav";
import s from "./Pager.module.css";

/** Однотонные фоны секций — у каждой свой цвет (Pager.module.css, .bg_*). */
export type Backdrop = "ink" | "red" | "smoke" | "mist" | "white";
/** Тема: перекрашивает токены текста (global.css) и шапку. */
export type Theme = "dark" | "light" | "accent";

export interface Page {
  id: string;
  /** Название для индикатора и дикторов. */
  label: string;
  bg: Backdrop;
  theme: Theme;
  node: ReactNode;
}

/**
 * Полноэкранные секции главной. React рисует их один раз; переходы, сборку
 * контента, цвет шапки и индикатор ведёт движок (engine.ts) прямо в DOM — без
 * перерисовок React во время движения.
 */
export const Pager = memo(function Pager({ pages }: { pages: Page[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const secRefs = useRef<HTMLElement[]>([]);
  const bgRefs = useRef<HTMLDivElement[]>([]);
  const contentRefs = useRef<HTMLDivElement[]>([]);
  const tickRefs = useRef<HTMLButtonElement[]>([]);
  const countRef = useRef<HTMLElement>(null);
  const [start] = useState(() => Math.max(0, pages.findIndex(p => `#${p.id}` === location.hash)));

  useLayoutEffect(() => {
    const root = rootRef.current!;
    const sections: EngineSection[] = pages.map((p, k) => ({
      id: p.id, theme: p.theme, el: secRefs.current[k], bg: bgRefs.current[k], content: contentRefs.current[k],
    }));
    const engine = createEngine({
      root, sections, start,
      onTone: t => { document.documentElement.dataset.tone = t; },
      onIndex: i => {
        tickRefs.current.forEach((b, k) => b.toggleAttribute("aria-current", k === i));
        if (countRef.current) countRef.current.textContent = String(i + 1);
      },
    });
    nav.go = id => engine.go(pages.findIndex(p => p.id === id));
    const unbind = bindInput(root, engine);
    // ссылки вида #contacts на самой странице — тоже переход к секции
    const onHash = () => { const k = pages.findIndex(p => `#${p.id}` === location.hash); if (k >= 0) engine.go(k); };
    addEventListener("hashchange", onHash);
    let cancelled = false;
    // шрифты загружены → прогрев → первое появление
    document.fonts.ready.then(() => {
      if (!cancelled) engine.startUp(() => root.setAttribute("data-ready", ""));
    });
    return () => { cancelled = true; unbind(); removeEventListener("hashchange", onHash); engine.destroy(); nav.go = () => {}; };
  }, [pages, start]);

  return (
    <div ref={rootRef} className={s.pager}>
      {pages.map((p, i) => (
        <section
          key={p.id} id={p.id} aria-label={p.label}
          ref={el => { if (el) secRefs.current[i] = el; }}
          className={`${s.page} theme-${p.theme}`}
        >
          <div ref={el => { if (el) bgRefs.current[i] = el; }} className={`${s.bg} ${s["bg_" + p.bg]}`} aria-hidden="true" />
          <div ref={el => { if (el) contentRefs.current[i] = el; }} className={s.content}>
            <div className={s.inner}>{p.node}</div>
          </div>
        </section>
      ))}

      {/* индикатор: «1 / 10» и риски (переход по клику); слева, на телефоне — снизу */}
      <nav className={s.meter} aria-label="Разделы страницы">
        <p className={s.count}><b ref={countRef}>{start + 1}</b> / {pages.length}</p>
        {pages.map((p, i) => (
          <button
            key={p.id} type="button" className={s.tick} aria-label={p.label} title={p.label}
            ref={el => { if (el) tickRefs.current[i] = el; }} onClick={() => nav.go(p.id)}
          />
        ))}
      </nav>
    </div>
  );
});
