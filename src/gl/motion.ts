/**
 * Физика и кривые для WebGL-анимаций — те же параметры, что были у CSS и motion,
 * чтобы движение выглядело один в один.
 */

/** Пружина (как useSpring из motion): stiffness, damping, mass. */
export class Spring {
  v = 0;
  target: number;
  constructor(public x: number, private k: number, private c: number, private m: number) {
    this.target = x;
  }
  set(t: number) { this.target = t; }
  /** Шаг на dt секунд. Возвращает true, пока пружина движется. */
  step(dt: number): boolean {
    if (this.x === this.target && this.v === 0) return false;
    // полунеявный Эйлер мелкими шагами — устойчиво при любом dt
    const h = 1 / 480;
    for (let t = 0; t < dt; t += h) {
      const s = Math.min(h, dt - t);
      const a = (-this.k * (this.x - this.target) - this.c * this.v) / this.m;
      this.v += a * s;
      this.x += this.v * s;
    }
    if (Math.abs(this.v) < 0.01 && Math.abs(this.x - this.target) < 0.002) {
      this.x = this.target;
      this.v = 0;
      return false;
    }
    return true;
  }
}

/** cubic-bezier(x1, y1, x2, y2) как в CSS: t (время 0..1) → прогресс. */
export function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dsx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-6) break;
      const d = dsx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    // страховка бисекцией, если Ньютон не сошёлся
    if (Math.abs(sx(t) - x) > 1e-4) {
      let lo = 0, hi = 1;
      t = x;
      for (let i = 0; i < 30; i++) {
        if (sx(t) < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
    }
    return sy(t);
  };
}

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const ease = bezier(0.25, 0.1, 0.25, 1); // CSS "ease"
