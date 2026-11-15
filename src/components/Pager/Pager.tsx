import { memo, useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { reducedMotion } from "../../lib/media";
import { holdScrolling } from "../../lib/scrolling";
import { invalidateRects } from "../WaveText/engine";
import s from "./Pager.module.css";

/** Однотонные фоны секций — у каждой свой цвет. */
export type BackdropKind = "dark" | "blue" | "light" | "graphite";

export interface Page {
  id: string;
  /** Название для индикатора и дикторов. */
  label: string;
  /** Однотонный фон секции (цвета — в Pager.module.css). */
  bg: BackdropKind;
  /** Светлая секция: тёмный текст (токены --text/--grey переопределяются), тёмная шапка. */
  light?: boolean;
  /** Контент растягивается на всю высоту секции (футер), а не стоит по центру. */
  fill?: boolean;
  node: ReactNode;
}

/**
 * Сборка контента: при входе в секцию элемент приходит снизу из прозрачности, по
 * очереди (i — номер в очереди) — начинается вместе с пролистыванием и кончается
 * чуть позже него. При уходе — та же сборка в обратной перемотке (последний
 * пришедший уходит первым). Только transform/opacity.
 */
export const reveal = (i: number) => ({ "data-reveal": "", style: { "--i": i } as CSSProperties });

interface Props {
  pages: Page[];
  index: number;
  onIndex: (i: number) => void;
  /** Главная активна — слушаем колесо, свайпы и клавиши, крутим цикл. */
  enabled: boolean;
  /** Прогрев видеокарты закончен — можно запускать появление первого экрана. */
  onReady?: () => void;
  /** Какая секция сейчас под шапкой (на середине пролистывания) — для цвета шапки. */
  onUnderHeader?: (i: number) => void;
}

/** Не чаще одного нового жеста за столько мс. */
const MIN_GAP = 250;
/** Пауза в событиях колеса, после которой жест считается законченным, мс. */
const QUIET = 120;
/** Сколько нужно «прокрутить», чтобы перейти, px. */
const WHEEL_STEP = 40;
const SWIPE_STEP = 50;

/** Пролистывание на одну секцию, мс (= сборка контента начинается вместе с ним). */
const DURATION = 800;
/** Кривая пролистывания — быстрый разгон, плавное торможение. */
const EASE_CSS = "cubic-bezier(.55, 0, .2, 1)";

/**
 * Полноэкранные секции. Переход: новая секция поднимается снизу и ужимает старую
 * по высоте (ширина не меняется) — старая сжимается к верху экрана ровно настолько,
 * насколько поднялась новая: граница одна, наезда нет. Назад — наоборот: старая
 * разжимается, новая уезжает вниз. Вместе с пролистыванием у
 * уходящей секции сборка контента проигрывается назад, у приходящей — вперёд:
 * новая секция въезжает пустой и собирается по ходу, к концу пролистывания
 * сборка ещё идёт.
 *
 * Движение — CSS-переходы transform, их ведёт композитор браузера (отдельный
 * поток): экран едет, даже если главный поток на миг занят. В момент жеста
 * главный поток только запускает пролистывание, перерисовка React и старт
 * сборки — следующим кадром. Фоны однотонные — одна заливка на секцию.
 *
 * Колесо и тачпад: событие копится до WHEEL_STEP, затем переход. Инерция тачпада
 * (затухающие события ещё 1–2 с) глотается, новый жест распознаётся сразу: пауза,
 * смена направления или рост силы прокрутки.
 * Если контент секции не влез (телефон), секция сначала прокручивается сама.
 * Неактивные секции — inert: Tab не уводит фокус за экран.
 */
export const Pager = memo(function Pager({ pages, index, onIndex, enabled, onReady, onUnderHeader }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const secRefs = useRef<(HTMLElement | null)[]>([]);
  const stageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const st = useRef({ index, busy: false, at: 0, last: 0, acc: 0, dir: 0 });
  st.current.index = index;
  const n = pages.length;
  const pad = (k: number) => String(k).padStart(2, "0");
  const underRef = useRef(onUnderHeader);
  underRef.current = onUnderHeader;

  // ---------- пролистывание: позы секций, движение — CSS-переходы на композиторе ----------
  const cur = useRef({ target: index, moving: new Set<number>(), headerT: 0 });
  /** Пролистать к секции T (animate=false — мгновенно встать). */
  const curtain = useRef<(T: number, animate?: boolean) => void>(() => {});

  useLayoutEffect(() => {
    const root = rootRef.current!;
    const C = cur.current;
    const TR = `transform ${DURATION}ms ${EASE_CSS}`;
    let H = root.clientHeight;
    // поза секции k, когда открыта T: T на месте; пройденные — сжаты по высоте к
    // верху экрана (transform-origin — верх); будущие — под экраном. Обе позы
    // меняются одним переходом с одной кривой: низ сжимаемой секции (H × scaleY) и
    // верх поднимающейся (H − сдвиг) совпадают в каждом кадре
    const pose = (k: number, T: number) =>
      k === T ? "none" : k < T ? "scale(1, 0.001)" : `translate3d(0, ${H}px, 0)`;
    const show = (k: number, on: boolean) => secRefs.current[k]?.toggleAttribute("data-on", on);
    const set = (k: number, T: number, animate: boolean) => {
      const el = secRefs.current[k];
      if (!el) return;
      el.style.transition = animate ? TR : "none";
      el.style.transform = pose(k, T);
    };
    curtain.current = (T, animate = !reducedMotion()) => {
      const prev = C.target;
      C.target = T;
      for (let k = 0; k < n; k++) {
        // едут только уходящая, приходящая и те, что ещё в пути; остальные
        // невидимы и мгновенно встают в позу относительно новой цели
        const involved = animate && (k === T || k === prev || C.moving.has(k));
        if (!involved) { set(k, T, false); show(k, k === T); C.moving.delete(k); continue; }
        show(k, true);
        set(k, T, true);
        C.moving.add(k);
      }
      // пока экран едет и собирается контент — курсор не трогает буквы и карты
      if (animate && T !== prev) holdScrolling(DURATION + 450);
      // цвет шапки — по секции под ней: меняется на середине пролистывания
      clearTimeout(C.headerT);
      C.headerT = window.setTimeout(() => underRef.current?.(T), !animate || T === prev ? 0 : DURATION * 0.5);
    };
    const onEnd = (e: TransitionEvent) => {
      const k = secRefs.current.indexOf(e.target as HTMLElement);
      if (k < 0 || e.propertyName !== "transform") return;
      C.moving.delete(k);
      if (k !== C.target) show(k, false);
      if (C.moving.size === 0) invalidateRects(); // заголовки встали на место
    };
    root.addEventListener("transitionend", onEnd);
    const onResize = () => { H = root.clientHeight; for (let k = 0; k < n; k++) if (!C.moving.has(k)) set(k, C.target, false); };
    addEventListener("resize", onResize);
    for (let k = 0; k < n; k++) { set(k, C.target, false); show(k, k === C.target); }
    return () => { root.removeEventListener("transitionend", onEnd); removeEventListener("resize", onResize); clearTimeout(C.headerT); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- один раз
  }, []);

  // секцию сменили снаружи (риски, ссылка «Частые вопросы», логотип)
  useLayoutEffect(() => { if (index !== cur.current.target) curtain.current(index); }, [index]);

  /*
   * Прогрев, как «экран загрузки» в играх: при первой встрече с новой графикой
   * (маска ленты, тени, шрифты) видеокарта компилирует шейдеры и растрирует слои —
   * заминки 50–400 мс. Сразу после загрузки, пока экран чёрный, все секции
   * несколько кадров рисуются поверх почти прозрачными (opacity .01 — глазу не
   * видно). Потом data-ready: стартует сборка первого экрана.
   */
  useEffect(() => {
    const root = rootRef.current!;
    const C = cur.current;
    let raf = 0;
    const frames = (k: number, fn: () => void) => { raf = requestAnimationFrame(() => (k > 1 ? frames(k - 1, fn) : fn())); };
    frames(2, () => {
      secRefs.current.forEach((el, k) => {
        if (!el || k === C.target) return;
        el.style.transition = "none";
        el.style.transform = "none";
        el.setAttribute("data-warm", "");
      });
      frames(4, () => {
        secRefs.current.forEach(el => el?.removeAttribute("data-warm"));
        curtain.current(C.target, false); // все — в свои позы, видна только текущая
        root.setAttribute("data-ready", "");
        onReady?.();
      });
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- один раз
  }, []);

  // ---------- ввод: колесо, тачпад, свайп, клавиши ----------
  useEffect(() => {
    if (!enabled) return;
    const root = rootRef.current!;
    const S = st.current;

    // в момент жеста главный поток делает минимум: запускает пролистывание (его ведёт
    // композитор), а перерисовка React и старт сборки контента — следующим кадром
    const go = (dir: number) => {
      const from = cur.current.target;
      const i = Math.max(0, Math.min(n - 1, from + dir));
      if (i === from) return;
      S.busy = true; S.at = performance.now(); S.acc = 0; S.dir = Math.sign(dir);
      curtain.current(i);
      requestAnimationFrame(() => onIndex(cur.current.target));
    };

    /** Можно ли прокрутить секцию (или ленту внутри неё) в эту сторону. */
    const canScroll = (target: EventTarget | null, dy: number) => {
      for (let el = target as HTMLElement | null; el && el !== root; el = el.parentElement) {
        if (el.scrollHeight <= el.clientHeight + 1) continue;
        const oy = getComputedStyle(el).overflowY;
        if (oy !== "auto" && oy !== "scroll") continue;
        if (dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0) return true;
      }
      return false;
    };

    const hist: number[] = []; // силы последних событий колеса (|deltaY|)
    const avg = (a: number[]) => a.reduce((acc, v) => acc + v, 0) / a.length;

    const onWheel = (e: WheelEvent) => {
      const now = performance.now();
      const gap = now - S.last;
      S.last = now;
      if (e.ctrlKey) return; // щипок тачпада — масштаб
      const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
      const dy = e.deltaY * k, dx = e.deltaX * k;
      if (Math.abs(dx) > Math.abs(dy)) return; // горизонтальный жест — ленте карт
      if (!S.busy && canScroll(e.target, dy)) return;
      e.preventDefault();
      const a = Math.abs(dy);
      if (gap > QUIET) hist.length = 0;
      hist.push(a);
      if (hist.length > 10) hist.shift();
      if (S.busy) {
        const rising = hist.length >= 5 && avg(hist.slice(-2)) > avg(hist.slice(0, -2)) * 1.4 + 2;
        const fresh = gap > QUIET || Math.sign(dy) !== S.dir || rising;
        if (!fresh || now - S.at < MIN_GAP) return;
        S.busy = false; S.acc = 0;
        hist.splice(0, hist.length - 1);
      }
      if (gap > QUIET) S.acc = 0;
      S.acc += dy;
      if (Math.abs(S.acc) >= WHEEL_STEP) go(Math.sign(S.acc));
    };

    let tx = 0, ty = 0, vertical: boolean | null = null, tTarget: EventTarget | null = null;
    const onTouchStart = (e: TouchEvent) => {
      tx = e.touches[0].clientX; ty = e.touches[0].clientY; vertical = null; tTarget = e.target;
    };
    const onTouchMove = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - tx, dy = e.touches[0].clientY - ty;
      if (vertical === null && Math.hypot(dx, dy) > 8) vertical = Math.abs(dy) > Math.abs(dx);
      if (vertical && !canScroll(tTarget, -dy) && e.cancelable) e.preventDefault();
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!vertical) return;
      const dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dy) < SWIPE_STEP || canScroll(tTarget, -dy)) return;
      if (S.busy && performance.now() - S.at < MIN_GAP) return;
      S.busy = false;
      go(dy < 0 ? 1 : -1);
    };

    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || e.altKey || e.ctrlKey || e.metaKey) return;
      const control = t.tagName === "BUTTON" || t.getAttribute("role") === "button";
      let dir = 0;
      if (e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !control && !e.shiftKey)) dir = 1;
      else if (e.key === "ArrowUp" || e.key === "PageUp" || (e.key === " " && !control && e.shiftKey)) dir = -1;
      else if (e.key === "Home") dir = -n;
      else if (e.key === "End") dir = n;
      if (!dir) return;
      e.preventDefault();
      if (S.busy && performance.now() - S.at < MIN_GAP) return;
      S.busy = false;
      go(dir);
    };

    root.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: false });
    root.addEventListener("touchend", onTouchEnd, { passive: true });
    addEventListener("keydown", onKey);
    return () => {
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove);
      root.removeEventListener("touchend", onTouchEnd);
      removeEventListener("keydown", onKey);
    };
  }, [enabled, n, onIndex]);

  // переход по клику (риски, ссылки) тоже блокирует колесо на MIN_GAP
  useEffect(() => { st.current.busy = true; st.current.at = performance.now(); }, [index]);

  // браузер мог сдвинуть контейнер (поиск по странице, фокус) — вернуть (только по событию)
  useEffect(() => {
    const r = rootRef.current!;
    const reset = () => { if (r.scrollTop || r.scrollLeft) { r.scrollTop = 0; r.scrollLeft = 0; } };
    r.addEventListener("scroll", reset, { passive: true });
    return () => r.removeEventListener("scroll", reset);
  }, []);

  return (
    <div
      ref={rootRef} className={s.pager}
      data-reduced={reducedMotion() ? "" : undefined} data-light={pages[index].light ? "" : undefined}
    >
      {pages.map((p, i) => (
        <section
          key={p.id} id={p.id} ref={el => { secRefs.current[i] = el; }}
          className={`${s.page} ${s[p.bg]} ${p.light ? s.light : ""} ${p.bg === "blue" ? s.vivid : ""}`}
          style={{ zIndex: i + 1 }}
          data-state={i === index ? "active" : i < index ? "before" : "after"}
          aria-label={p.label} inert={i !== index}
        >
          <div ref={el => { stageRefs.current[i] = el; }} className={s.stage}>
            <div className={s.body}>
              <div className={p.fill ? s.fill : s.inner}>{p.node}</div>
            </div>
          </div>
        </section>
      ))}

      {/* индикатор слева: номер секции и риски, по рискам можно перейти */}
      <nav className={s.meter} aria-label="Разделы страницы">
        <p className={s.count}><b>{pad(index + 1)}</b> / {pad(n)}</p>
        <div className={s.ticks}>
          {pages.map((p, i) => (
            <button
              key={p.id} type="button" className={s.tick} aria-label={p.label} title={p.label}
              aria-current={i === index ? "true" : undefined} onClick={() => onIndex(i)}
            />
          ))}
        </div>
      </nav>
    </div>
  );
});
