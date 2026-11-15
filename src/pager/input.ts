/*
 * Ввод главной: колесо, тачпад, свайп, клавиши → engine.step / engine.go.
 * Один жест — одна секция. Инерция тачпада (затухающие события ещё 1–2 с после
 * взмаха) глотается; новый жест распознаётся сразу: пауза, смена направления или
 * рост силы прокрутки. Если контент секции не влез (телефон) — сначала
 * прокручивается он, переход — когда упёрлись в край.
 */
import type { Engine } from "./engine";

/** Пауза в событиях колеса, после которой жест считается законченным, мс. */
const QUIET = 120;
/** Сколько нужно «прокрутить» колесом/тачпадом для перехода, px. */
const WHEEL_STEP = 40;
/** Длина свайпа пальцем для перехода, px. */
const SWIPE_STEP = 50;

/** Можно ли прокрутить что-то под курсором (контент секции) в эту сторону. */
function canScroll(root: HTMLElement, target: EventTarget | null, dy: number) {
  for (let el = target as HTMLElement | null; el && el !== root; el = el.parentElement) {
    if (el.scrollHeight <= el.clientHeight + 1) continue;
    const oy = getComputedStyle(el).overflowY;
    if (oy !== "auto" && oy !== "scroll") continue;
    if (dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0) return true;
  }
  return false;
}

export function bindInput(root: HTMLElement, engine: Engine) {
  // ---------- колесо и тачпад ----------
  let last = 0, acc = 0, spent = false, spentDir = 0;
  const hist: number[] = [];
  const avg = (a: number[]) => a.reduce((x, v) => x + v, 0) / a.length;

  const onWheel = (e: WheelEvent) => {
    const now = performance.now();
    const gap = now - last;
    last = now;
    if (e.ctrlKey) return; // щипок тачпада — масштаб
    const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
    const dy = e.deltaY * k, dx = e.deltaX * k;
    if (Math.abs(dx) > Math.abs(dy)) return;
    if (!engine.running() && !spent && canScroll(root, e.target, dy)) return;
    e.preventDefault();
    if (gap > QUIET) { hist.length = 0; acc = 0; spent = false; }
    hist.push(Math.abs(dy));
    if (hist.length > 10) hist.shift();
    if (spent) {
      // этот жест уже перелистнул: дальше — инерция, если только не новый взмах
      const rising = hist.length >= 5 && avg(hist.slice(-2)) > avg(hist.slice(0, -2)) * 1.4 + 2;
      if (!rising && Math.sign(dy) === spentDir) return;
      spent = false; acc = 0; hist.splice(0, hist.length - 1);
    }
    acc += dy;
    if (Math.abs(acc) >= WHEEL_STEP) {
      spentDir = Math.sign(acc);
      spent = true; acc = 0;
      engine.step(spentDir);
    }
  };

  // ---------- палец ----------
  let tx = 0, ty = 0, vertical: boolean | null = null, tTarget: EventTarget | null = null;
  const onTouchStart = (e: TouchEvent) => {
    tx = e.touches[0].clientX; ty = e.touches[0].clientY; vertical = null; tTarget = e.target;
  };
  const onTouchMove = (e: TouchEvent) => {
    const dx = e.touches[0].clientX - tx, dy = e.touches[0].clientY - ty;
    if (vertical === null && Math.hypot(dx, dy) > 8) vertical = Math.abs(dy) > Math.abs(dx);
    if (vertical && (engine.running() || !canScroll(root, tTarget, -dy)) && e.cancelable) e.preventDefault();
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (!vertical) return;
    const dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dy) < SWIPE_STEP) return;
    if (!engine.running() && canScroll(root, tTarget, -dy)) return;
    engine.step(dy < 0 ? 1 : -1);
  };

  // ---------- клавиши ----------
  const onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || e.altKey || e.ctrlKey || e.metaKey) return;
    const control = t.tagName === "BUTTON" || t.tagName === "A";
    let dir = 0;
    if (e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !control && !e.shiftKey)) dir = 1;
    else if (e.key === "ArrowUp" || e.key === "PageUp" || (e.key === " " && !control && e.shiftKey)) dir = -1;
    else if (e.key === "Home") { e.preventDefault(); engine.go(0); return; }
    else if (e.key === "End") { e.preventDefault(); engine.go(Infinity); return; }
    if (!dir) return;
    e.preventDefault();
    engine.step(dir);
  };

  // браузер мог сдвинуть контейнер (поиск по странице, фокус) — вернуть
  const onScroll = () => { if (root.scrollTop || root.scrollLeft) { root.scrollTop = 0; root.scrollLeft = 0; } };

  root.addEventListener("wheel", onWheel, { passive: false });
  root.addEventListener("touchstart", onTouchStart, { passive: true });
  root.addEventListener("touchmove", onTouchMove, { passive: false });
  root.addEventListener("touchend", onTouchEnd, { passive: true });
  root.addEventListener("scroll", onScroll, { passive: true });
  addEventListener("keydown", onKey);
  return () => {
    root.removeEventListener("wheel", onWheel);
    root.removeEventListener("touchstart", onTouchStart);
    root.removeEventListener("touchmove", onTouchMove);
    root.removeEventListener("touchend", onTouchEnd);
    root.removeEventListener("scroll", onScroll);
    removeEventListener("keydown", onKey);
  };
}
