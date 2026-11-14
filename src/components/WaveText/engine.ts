/**
 * Физика «курсор расталкивает буквы» — один общий движок на всю страницу.
 *
 * Каждый WaveText регистрирует свои буквы. Движок слушает мышь, считает пружины
 * и пишет transform прямо в style — без перерисовок React. Кадры крутятся только
 * пока буквы движутся; в покое requestAnimationFrame не вызывается.
 */

export interface WaveOptions {
  /** Радиус влияния курсора, px. */
  radius: number;
  /** Максимальный сдвиг буквы, px. */
  push: number;
  /** Можно ли сейчас реагировать на курсор (экран активен). */
  isLive: () => boolean;
}

interface Letter {
  el: HTMLElement;
  rx: number; ry: number; // центр буквы в покое — относительно контейнера
  line: number;           // номер строки (для тени при наезде на верхнюю)
  x: number; y: number; vx: number; vy: number;
}

interface Item extends WaveOptions {
  root: HTMLElement;
  letters: Letter[];
  running: boolean;
}

const STIFFNESS = 0.16; // жёсткость пружины
const DAMPING = 0.74;   // затухание
const EPS = 0.05;       // ниже этого считаем, что буква остановилась

const items = new Set<Item>();
let mx = -1e4, my = -1e4;
let listening = false;

function measure(it: Item) {
  for (const l of it.letters) l.el.style.transform = "";
  const r = it.root.getBoundingClientRect();
  const lh = parseFloat(getComputedStyle(it.root).fontSize) * 0.9;
  let top0: number | null = null;
  for (const l of it.letters) {
    const b = l.el.getBoundingClientRect();
    l.rx = b.left + b.width / 2 - r.left;
    l.ry = b.top + b.height / 2 - r.top;
    if (top0 === null) top0 = l.ry;
    l.line = Math.round((l.ry - top0) / lh);
    l.x = l.y = l.vx = l.vy = 0;
  }
}

function frame(it: Item) {
  const r = it.root.getBoundingClientRect();
  const live = it.isLive();
  let moving = false;

  for (const l of it.letters) {
    const dx = r.left + l.rx - mx, dy = r.top + l.ry - my;
    const d = Math.hypot(dx, dy) || 1;
    let tx = 0, ty = 0;
    if (live && d < it.radius) {
      const f = 1 - d / it.radius;
      const p = f * f * it.push;
      tx = (dx / d) * p * 0.35;
      ty = (dy / d) * p;
    }
    l.vx = (l.vx + (tx - l.x) * STIFFNESS) * DAMPING;
    l.vy = (l.vy + (ty - l.y) * STIFFNESS) * DAMPING;
    l.x += l.vx; l.y += l.vy;
    if (Math.abs(l.vx) + Math.abs(l.vy) + Math.abs(tx - l.x) + Math.abs(ty - l.y) > EPS) moving = true;

    l.el.style.transform = `translate3d(${l.x.toFixed(2)}px, ${l.y.toFixed(2)}px, 0) rotate(${(l.x * 0.25).toFixed(2)}deg)`;

    // буква нижней строки, наехавшая на верхнюю, отбрасывает тень
    if (l.line > 0) {
      const a = Math.min(0.9, Math.max(0, (-l.y - 6) / 36));
      l.el.style.textShadow = a > 0.01
        ? `0 ${(6 + a * 14).toFixed(1)}px ${(14 + a * 22).toFixed(1)}px rgba(0,0,0,${a.toFixed(2)}), 0 2px 6px rgba(0,0,0,${(a * 0.7).toFixed(2)})`
        : "";
    }
  }

  if (moving) requestAnimationFrame(() => frame(it));
  else it.running = false;
}

function kick(it: Item) {
  if (it.running) return;
  it.running = true;
  requestAnimationFrame(() => frame(it));
}

const kickLive = () => items.forEach(it => { if (it.isLive() || it.running) kick(it); });
const measureAll = () => { items.forEach(measure); kickLive(); };

function listen() {
  if (listening) return;
  listening = true;
  addEventListener("mousemove", e => { mx = e.clientX; my = e.clientY; kickLive(); }, { passive: true });
  document.addEventListener("mouseleave", () => { mx = my = -1e4; kickLive(); });
  addEventListener("resize", measureAll);
  document.fonts?.ready.then(() => setTimeout(measureAll, 50));
}

/** Подключить буквы контейнера к движку. Возвращает функцию отключения. */
export function register(root: HTMLElement, opts: WaveOptions) {
  listen();
  const letters: Letter[] = [...root.querySelectorAll<HTMLElement>("[data-ch]")].map(el => ({
    el, rx: 0, ry: 0, line: 0, x: 0, y: 0, vx: 0, vy: 0,
  }));
  const it: Item = { ...opts, root, letters, running: false };
  items.add(it);
  measure(it);
  return {
    remeasure: () => measure(it),
    unregister: () => { items.delete(it); },
  };
}
