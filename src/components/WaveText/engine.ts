/**
 * Физика «курсор расталкивает буквы» — один общий движок на всю страницу.
 *
 * Каждый WaveText регистрирует свои буквы. Движок слушает мышь, считает пружины
 * и пишет transform прямо в style — без перерисовок React.
 *
 * Производительность (см. docs/ANIMATIONS.md):
 * - один цикл requestAnimationFrame на все заголовки; в покое он не крутится;
 * - положение заголовка на экране кешируется (страница не прокручивается — секции
 *   Pager неподвижны между переходами) и перечитывается только после ресайза и
 *   перехода секций (invalidateRects). Раньше getBoundingClientRect звался каждый
 *   кадр движения мыши — пока идут анимации появления, это принудительный пересчёт
 *   раскладки на каждом кадре (замер: ~375 мс за переход на слабом процессоре);
 * - заголовок далеко от курсора и в покое пропускается целиком;
 * - в style пишется только изменившееся значение;
 * - буква в покое сбрасывает transform, и браузер убирает её отдельный слой
 *   (раньше каждая буква всегда была слоем — их были сотни).
 */

import { scrolling } from "../../lib/scrolling";

export interface WaveOptions {
  /** Радиус влияния курсора, px. */
  radius: number;
  /** Максимальный сдвиг буквы, px. */
  push: number;
  /** Можно ли сейчас реагировать на курсор (экран активен). */
  isLive: () => boolean;
  /**
   * Свой отрисовщик (WebGL): движок не пишет style, а после каждого шага
   * вызывает onFrame — смещения букв лежат в handle.letters (x, y).
   */
  onFrame?: () => void;
}

export interface Letter {
  el: HTMLElement;
  rx: number; ry: number; // центр буквы в покое — относительно контейнера
  line: number;           // номер строки (для тени при наезде на верхнюю)
  x: number; y: number; vx: number; vy: number;
  tf: string; sh: string; // последние записанные transform и text-shadow
}

interface Item extends WaveOptions {
  root: HTMLElement;
  letters: Letter[];
  w: number; h: number;   // размер контейнера (для отсечения по расстоянию)
  moving: boolean;        // есть сдвинутые буквы
  rect: { left: number; top: number } | null; // положение на экране (кеш; null — перечитать)
}

const STIFFNESS = 0.16; // жёсткость пружины
const DAMPING = 0.74;   // затухание
const EPS = 0.05;       // ниже этого считаем, что буква остановилась

const items = new Set<Item>();
let mx = -1e4, my = -1e4;
let listening = false;
let raf = 0;

function measure(it: Item) {
  for (const l of it.letters) { l.el.style.transform = ""; l.el.style.textShadow = ""; }
  const r = it.root.getBoundingClientRect();
  it.w = r.width; it.h = r.height;
  it.rect = null; // в момент замера секция могла быть за экраном — перечитаем при первом кадре
  const lh = parseFloat(getComputedStyle(it.root).fontSize) * 0.9;
  let top0: number | null = null;
  for (const l of it.letters) {
    const b = l.el.getBoundingClientRect();
    l.rx = b.left + b.width / 2 - r.left;
    l.ry = b.top + b.height / 2 - r.top;
    if (top0 === null) top0 = l.ry;
    l.line = Math.round((l.ry - top0) / lh);
    l.x = l.y = l.vx = l.vy = 0;
    l.tf = l.sh = "";
  }
  it.moving = false;
}

/** Курсор достаточно близко к заголовку, чтобы задеть буквы. */
function near(it: Item, r: { left: number; top: number }) {
  const pad = it.radius;
  return mx > r.left - pad && mx < r.left + it.w + pad && my > r.top - pad && my < r.top + it.h + pad;
}

function step(it: Item, r: { left: number; top: number }) {
  const live = it.isLive() && near(it, r);
  let moving = false;

  for (const l of it.letters) {
    let tx = 0, ty = 0;
    if (live) {
      const dx = r.left + l.rx - mx, dy = r.top + l.ry - my;
      const d = Math.hypot(dx, dy) || 1;
      if (d < it.radius) {
        const f = 1 - d / it.radius;
        const p = f * f * it.push;
        tx = (dx / d) * p * 0.35;
        ty = (dy / d) * p;
      }
    }
    l.vx = (l.vx + (tx - l.x) * STIFFNESS) * DAMPING;
    l.vy = (l.vy + (ty - l.y) * STIFFNESS) * DAMPING;
    l.x += l.vx; l.y += l.vy;

    let tf: string;
    if (Math.abs(l.vx) + Math.abs(l.vy) + Math.abs(tx - l.x) + Math.abs(ty - l.y) > EPS) {
      moving = true;
      tf = `translate3d(${l.x.toFixed(2)}px, ${l.y.toFixed(2)}px, 0) rotate(${(l.x * 0.25).toFixed(2)}deg)`;
    } else if (tx === 0 && ty === 0) {
      // буква вернулась на место — снимаем transform, слой исчезает
      l.x = l.y = l.vx = l.vy = 0;
      tf = "";
    } else {
      tf = l.tf; // замерла в сдвинутом положении — ничего не пишем
    }
    if (it.onFrame) continue; // рисует WebGL — в DOM ничего не пишем
    if (tf !== l.tf) { l.el.style.transform = tf; l.tf = tf; }

    // буква нижней строки, наехавшая на верхнюю, отбрасывает тень
    if (l.line > 0) {
      const a = Math.min(0.9, Math.max(0, (-l.y - 6) / 36));
      const sh = a > 0.01
        ? `0 ${(6 + a * 14).toFixed(1)}px ${(14 + a * 22).toFixed(1)}px rgba(0,0,0,${a.toFixed(2)}), 0 2px 6px rgba(0,0,0,${(a * 0.7).toFixed(2)})`
        : "";
      if (sh !== l.sh) { l.el.style.textShadow = sh; l.sh = sh; }
    }
  }
  it.moving = moving;
  it.onFrame?.();
  return moving;
}

function frame() {
  raf = 0;
  // 1) только чтения (и то из кеша)
  const work: [Item, { left: number; top: number }][] = [];
  for (const it of items) {
    if (!it.moving && !it.isLive()) continue;
    if (!it.rect) { const b = it.root.getBoundingClientRect(); it.rect = { left: b.left, top: b.top }; }
    const r = it.rect;
    if (!it.moving && !near(it, r)) continue; // далеко и в покое — пропускаем
    work.push([it, r]);
  }
  // 2) только записи
  let again = false;
  for (const [it, r] of work) if (step(it, r)) again = true;
  if (again) raf = requestAnimationFrame(frame);
}

function kick() {
  if (!raf) raf = requestAnimationFrame(frame);
}

const measureAll = () => { items.forEach(measure); kick(); };

/** Заголовки сдвинулись на экране (закончился переход секций) — перечитать положение. */
export function invalidateRects() { items.forEach(it => { it.rect = null; }); }

function listen() {
  if (listening) return;
  listening = true;
  // во время прокрутки синтетические mousemove (страница едет под курсором)
  // буквы не трогают — кадры достаются прокрутке
  addEventListener("mousemove", e => { mx = e.clientX; my = e.clientY; if (!scrolling()) kick(); }, { passive: true });
  document.addEventListener("mouseleave", () => { mx = my = -1e4; kick(); });
  addEventListener("resize", measureAll);
  document.fonts?.ready.then(() => setTimeout(measureAll, 50));
}

/** Подключить буквы контейнера к движку. Возвращает функцию отключения. */
export function register(root: HTMLElement, opts: WaveOptions) {
  listen();
  const letters: Letter[] = [...root.querySelectorAll<HTMLElement>("[data-ch]")].map(el => ({
    el, rx: 0, ry: 0, line: 0, x: 0, y: 0, vx: 0, vy: 0, tf: "", sh: "",
  }));
  const it: Item = { ...opts, root, letters, w: 0, h: 0, moving: false, rect: null };
  items.add(it);
  measure(it);
  return {
    letters,
    remeasure: () => measure(it),
    unregister: () => { items.delete(it); },
  };
}
