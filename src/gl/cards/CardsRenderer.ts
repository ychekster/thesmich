import { canvasDpr, createGl, createLoop, program, renderTarget, textureFrom, unitQuad, type GL, type Program } from "../core";
import { Spring, bezier, clamp, ease } from "../motion";
import type { FaceRaster } from "../raster";
import { scrolling } from "../../lib/scrolling";
import { FACE_FS, FACE_VS, SHADOW_FS, SHADOW_VS, SPRITE_FS, SPRITE_VS } from "./shaders";

/*
 * Карты на WebGL: частые вопросы (4 карты) и удостоверения команды (одна большая).
 *
 * Один холст поверх сетки карт. Под ним — невидимые DOM-кнопки (клик,
 * клавиатура, экранные дикторы); холст только рисует. Кадры идут, лишь пока
 * что-то движется (наклон, переворот, раздача); при прокрутке холст — готовая
 * картинка, которую браузер просто сдвигает. Параметры движения — те же, что
 * были у CSS/motion-версии (FlipCard.tsx), поэтому выглядит так же.
 */

const TILT = { k: 170, c: 26, m: 0.7 };   // пружина наклона и нажатия (как useSpring)
const FLIP_MS = 750;
const flipEase = bezier(0.65, 0, 0.35, 1);
const dealEase = bezier(0.16, 1, 0.3, 1);
const SHADOW_RES = 0.5; // тень размыта — запекаем в половинном разрешении, разницы не видно

interface ShadowLook { sigma: number; radius: number; alpha: number; k: number }

/** Вид и физика карт. FAQ_LOOK — карты частых вопросов (как было в CSS). */
export interface CardLook {
  /** Скругление углов по размеру карты, css px. */
  radius: (w: number, h: number) => number;
  maxTilt: number;      // градусов
  perspective: number;  // px, как CSS perspective
  /** Тень: размытие σ, скругление, непрозрачность; k — масштаб её сдвига. */
  shadow: (w: number, h: number) => ShadowLook;
  /** Поля холста вокруг сетки: тень, наклон, раздача снизу. */
  pad: { x: number; top: number; bottom: number };
  /** Материал: 0 (по умолчанию) — глянец, 1 — матовый с зерном (удостоверения). */
  matte?: number;
}

export const FAQ_LOOK: CardLook = {
  radius: () => 26,
  maxTilt: 10,
  perspective: 1100,
  shadow: () => ({ sigma: 28, radius: 30, alpha: 0.85 * 0.7, k: 1 }),
  pad: { x: 110, top: 60, bottom: 260 },
};

interface Card {
  x: number; y: number; w: number; h: number; // слот на холсте, css px
  radius: number; sh: ShadowLook;
  rx: Spring; ry: Spring; scale: Spring;
  flipFrom: number; flipTo: number; flipStart: number; flipDur: number; flip: number;
  tex: [WebGLTexture | null, WebGLTexture | null];
  shadow: WebGLTexture | null; // запечённая тень (под размер карты)
}

export interface CardsOptions {
  interactive: boolean; // мышь и без reduced motion: наклон, блик, нажатие
  reduced: boolean;     // reduced motion: без раздачи и с мгновенным переворотом
  look?: CardLook;      // по умолчанию — FAQ_LOOK
  touch?: boolean;      // наклон пальцем (удостоверения): pointer/press с force
  onError?: () => void; // растр сторон упал — компонент покажет DOM-карты
}

/** Растр сторон карт под их размеры (текст, масти, плашки) — см. gl/raster.ts. */
export type RasterFn = (sizes: { w: number; h: number }[], dpr: number) => Promise<FaceRaster[]>;

const FACE_U = ["u_res", "u_center", "u_size", "u_radius", "u_rot", "u_persp", "u_dealY", "u_back", "u_spec", "u_alpha", "u_matte", "u_tex"] as const;
const SHADOW_U = ["u_res", "u_rect", "u_sigma", "u_radius", "u_alpha"] as const;
const SPRITE_U = ["u_res", "u_rect", "u_tex", "u_alpha"] as const;

export class CardsRenderer {
  private gl: GL | null;
  private face!: Program<typeof FACE_U[number]>;
  private shadow!: Program<typeof SHADOW_U[number]>;
  private sprite!: Program<typeof SPRITE_U[number]>;
  private vao!: WebGLVertexArrayObject;
  private look: CardLook;
  private cards: Card[];
  private rasters: FaceRaster[] | null = null;
  private cssW = 0; private cssH = 0; private dpr = 1;
  private dealAt = -1;          // время начала раздачи (-1 — ещё не раздали)
  private wantDeal = false;
  private last = 0;
  private layoutId = 0;
  private rasterTimer = 0;
  private loop = createLoop(now => this.frame(now));
  private ro: ResizeObserver;
  private dead = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private grid: HTMLElement,
    private slots: HTMLElement[],
    private rasterFn: RasterFn,
    private opts: CardsOptions,
  ) {
    this.look = opts.look ?? FAQ_LOOK;
    this.gl = createGl(canvas);
    this.cards = slots.map(() => ({
      x: 0, y: 0, w: 0, h: 0,
      radius: 0, sh: this.look.shadow(0, 0),
      rx: new Spring(0, TILT.k, TILT.c, TILT.m),
      ry: new Spring(0, TILT.k, TILT.c, TILT.m),
      scale: new Spring(1, TILT.k, TILT.c, TILT.m),
      flipFrom: 0, flipTo: 0, flipStart: 0, flipDur: 0, flip: 0,
      tex: [null, null], shadow: null,
    }));
    if (this.gl) {
      try { this.initGl(); } catch (e) { console.warn(e); this.gl = null; } // → DOM-карты
    }
    canvas.addEventListener("webglcontextlost", this.onLost);
    canvas.addEventListener("webglcontextrestored", this.onRestored);
    this.ro = new ResizeObserver(() => this.layout());
    this.ro.observe(grid);
  }

  /** Получилось ли создать WebGL (иначе компонент покажет DOM-карты). */
  get ok() { return !!this.gl; }

  private initGl() {
    const gl = this.gl!;
    this.face = program(gl, FACE_VS, FACE_FS, FACE_U);
    this.shadow = program(gl, SHADOW_VS, SHADOW_FS, SHADOW_U);
    this.sprite = program(gl, SPRITE_VS, SPRITE_FS, SPRITE_U);
    this.vao = unitQuad(gl);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // предумноженная альфа
    if (this.rasters) this.upload();
  }

  private onLost = (e: Event) => { e.preventDefault(); this.loop.stop(); };
  private onRestored = () => {
    this.gl = createGl(this.canvas);
    if (!this.gl) return;
    this.cards.forEach(c => { c.tex = [null, null]; c.shadow = null; });
    this.initGl();
    this.loop.invalidate();
  };

  /** Размеры и положение слотов → размер холста; растр сторон — после паузы в ресайзе. */
  private layout() {
    const gl = this.gl;
    if (!gl || this.dead) return;
    const PAD = this.look.pad;
    const g = this.grid.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    // по бокам холст не выходит за экран (иначе появится горизонтальная прокрутка)
    const padL = Math.max(0, Math.min(PAD.x, g.left));
    const padR = Math.max(0, Math.min(PAD.x, vw - g.right));
    this.cssW = g.width + padL + padR;
    this.cssH = g.height + PAD.top + PAD.bottom;
    Object.assign(this.canvas.style, {
      left: `${-padL}px`, top: `${-PAD.top}px`, width: `${this.cssW}px`, height: `${this.cssH}px`,
    });
    this.dpr = canvasDpr(gl, this.cssW, this.cssH);
    this.canvas.width = Math.round(this.cssW * this.dpr);
    this.canvas.height = Math.round(this.cssH * this.dpr);

    this.slots.forEach((el, i) => {
      const c = this.cards[i];
      c.x = el.offsetLeft + padL; c.y = el.offsetTop + PAD.top;
      c.w = el.offsetWidth; c.h = el.offsetHeight;
      c.radius = this.look.radius(c.w, c.h);
      c.sh = this.look.shadow(c.w, c.h);
    });
    this.loop.invalidate(); // сразу перерисовать со старыми текстурами
    clearTimeout(this.rasterTimer);
    this.rasterTimer = window.setTimeout(() => this.raster(), this.rasters ? 150 : 0);
  }

  private async raster() {
    const id = ++this.layoutId;
    const sizes = this.cards.map(c => ({ w: c.w, h: c.h }));
    let rasters: FaceRaster[];
    try {
      rasters = await this.rasterFn(sizes, this.dpr);
    } catch (e) {
      // без этого карта молча не появилась бы (чёрный экран)
      console.warn(e);
      if (!this.dead) this.opts.onError?.();
      return;
    }
    if (id !== this.layoutId || this.dead) return; // пока растеризовали, размер снова поменялся
    this.rasters = rasters;
    this.upload();
    if (this.wantDeal && this.dealAt < 0) this.startDeal();
    this.loop.invalidate();
  }

  private upload() {
    const gl = this.gl;
    if (!gl || !this.rasters) return;
    this.cards.forEach((c, i) => {
      const r = this.rasters![i];
      c.tex = [textureFrom(gl, r.front, c.tex[0] ?? undefined), textureFrom(gl, r.back, c.tex[1] ?? undefined)];
      this.bakeShadow(c);
    });
  }

  /** Тень = размытый скруглённый прямоугольник; форма не меняется, только сдвиг. */
  private bakeShadow(c: Card) {
    const gl = this.gl!;
    const S = c.sh;
    const m = 3 * S.sigma;
    const qw = c.w * 0.84 + 2 * m, qh = c.h * 0.9 + 2 * m;
    const rt = renderTarget(gl, Math.ceil(qw * this.dpr * SHADOW_RES), Math.ceil(qh * this.dpr * SHADOW_RES));
    gl.bindFramebuffer(gl.FRAMEBUFFER, rt.fb);
    gl.viewport(0, 0, rt.w, rt.h);
    gl.disable(gl.BLEND);
    gl.useProgram(this.shadow.prog);
    gl.bindVertexArray(this.vao);
    const su = this.shadow.u;
    gl.uniform2f(su.u_res, qw, qh);
    gl.uniform4f(su.u_rect, m, m, c.w * 0.84, c.h * 0.9);
    gl.uniform1f(su.u_sigma, S.sigma);
    gl.uniform1f(su.u_radius, S.radius);
    gl.uniform1f(su.u_alpha, S.alpha);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(rt.fb);
    gl.enable(gl.BLEND);
    if (c.shadow) gl.deleteTexture(c.shadow);
    c.shadow = rt.tex;
  }

  // ---------- ввод ----------

  /** px, py — положение курсора в слоте, 0..1. touch — палец (если включено opts.touch). */
  pointer(i: number, px: number, py: number, touch = false) {
    // карта, проехавшая под неподвижным курсором при прокрутке, не наклоняется:
    // кадры холста во время прокрутки не нужны
    if (touch ? !this.opts.touch || this.opts.reduced : !this.opts.interactive || scrolling()) return;
    const c = this.cards[i];
    const t = this.look.maxTilt;
    c.rx.set(-(py - 0.5) * 2 * t); // точка под курсором уходит вглубь
    c.ry.set((px - 0.5) * 2 * t);
    this.loop.invalidate();
  }
  leave(i: number) {
    const c = this.cards[i];
    c.rx.set(0); c.ry.set(0); c.scale.set(1);
    this.loop.invalidate();
  }
  press(i: number, down: boolean, touch = false) {
    if (touch ? !this.opts.touch || this.opts.reduced : !this.opts.interactive) return;
    this.cards[i].scale.set(down ? 0.97 : 1);
    this.loop.invalidate();
  }
  /** Переворот к нужной стороне. Повторный клик посреди переворота — обратно, быстрее (как CSS). */
  flip(i: number, flipped: boolean, now = performance.now()) {
    const c = this.cards[i];
    const to = flipped ? 180 : 0;
    if (c.flipTo === to) return;
    const dist = Math.abs(to - c.flip);
    c.flipFrom = c.flip; c.flipTo = to; c.flipStart = now;
    c.flipDur = this.opts.reduced ? 1 : FLIP_MS * (dist / 180);
    this.loop.invalidate();
  }
  /** Раздать карты (блок попал в экран). */
  deal() {
    this.wantDeal = true;
    if (this.rasters && this.dealAt < 0) this.startDeal();
  }
  private startDeal() {
    this.dealAt = this.opts.reduced ? -1e9 : performance.now();
    this.loop.invalidate();
  }

  destroy() {
    this.dead = true;
    this.loop.stop();
    clearTimeout(this.rasterTimer);
    this.ro.disconnect();
    this.canvas.removeEventListener("webglcontextlost", this.onLost);
    this.canvas.removeEventListener("webglcontextrestored", this.onRestored);
    // ресурсы удаляем явно, а контекст не «теряем»: холст может быть
    // переиспользован (повторный монтаж в StrictMode)
    const gl = this.gl;
    if (gl && !gl.isContextLost() && this.vao) {
      this.cards.forEach(c => [...c.tex, c.shadow].forEach(x => x && gl.deleteTexture(x)));
      gl.deleteProgram(this.face.prog);
      gl.deleteProgram(this.shadow.prog);
      gl.deleteProgram(this.sprite.prog);
      gl.deleteVertexArray(this.vao);
    }
    this.gl = null;
  }

  // ---------- кадр ----------

  private frame(now: number): boolean {
    const gl = this.gl;
    if (!gl || gl.isContextLost() || !this.rasters) return false;
    const dt = Math.min((now - (this.last || now)) / 1000, 0.064);
    this.last = now;
    let busy = false;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (this.dealAt < 0) { this.last = 0; return false; } // до раздачи карт не видно
    gl.bindVertexArray(this.vao);

    this.cards.forEach((c, n) => {
      // пружины и переворот
      if (c.rx.step(dt)) busy = true;
      if (c.ry.step(dt)) busy = true;
      if (c.scale.step(dt)) busy = true;
      if (c.flip !== c.flipTo) {
        const p = clamp((now - c.flipStart) / c.flipDur, 0, 1);
        c.flip = p >= 1 ? c.flipTo : c.flipFrom + (c.flipTo - c.flipFrom) * flipEase(p);
        busy = true;
      }

      // раздача: снизу 120px, прозрачность .7s ease, сдвиг 1s, задержка 90ms на карту
      const t = now - this.dealAt - n * 90;
      const op = ease(clamp(t / 700, 0, 1));
      const dealY = 120 * (1 - dealEase(clamp(t / 1000, 0, 1)));
      if (t < 1000) busy = true;
      if (op <= 0) return;

      const rx = c.rx.x, ry = c.ry.x;
      // тень на «столе»: вниз-вправо от света, дальше при наклоне
      const S = c.sh;
      const sx = ry * -1.6 * S.k, sy = (22 + rx * 1.6) * S.k;
      const m = 3 * S.sigma;
      gl.useProgram(this.sprite.prog);
      const pu = this.sprite.u;
      gl.uniform2f(pu.u_res, this.cssW, this.cssH);
      gl.uniform4f(pu.u_rect, c.x + c.w * 0.08 + sx - m, c.y + c.h * 0.1 + sy + dealY - m, c.w * 0.84 + 2 * m, c.h * 0.9 + 2 * m);
      gl.uniform1f(pu.u_alpha, op);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, c.shadow);
      gl.uniform1i(pu.u_tex, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // видимая сторона: лицо, если повёрнуто к зрителю (backface-visibility)
      const total = ry + c.flip;
      const back = Math.cos((total * Math.PI) / 180) < 0;
      const angle = back ? total + 180 : total;
      // блик: против наклона, ярче, когда карта повёрнута к свету (вверх-влево)
      const specX = ((back ? ry : -ry) * 2.2) / 100 * c.w * 1.8;
      const specY = (rx * 2.2) / 100 * c.h * 1.8;
      const specO = clamp(0.55 + (back ? rx + ry : rx - ry) * 0.045, 0.25, 1);

      gl.useProgram(this.face.prog);
      const fu = this.face.u;
      gl.uniform2f(fu.u_res, this.cssW, this.cssH);
      gl.uniform2f(fu.u_center, c.x + c.w / 2, c.y + c.h / 2);
      gl.uniform2f(fu.u_size, c.w, c.h);
      gl.uniform1f(fu.u_radius, c.radius);
      gl.uniform3f(fu.u_rot, (rx * Math.PI) / 180, (angle * Math.PI) / 180, c.scale.x);
      gl.uniform1f(fu.u_persp, this.look.perspective);
      gl.uniform1f(fu.u_dealY, dealY);
      gl.uniform1f(fu.u_back, back ? 1 : 0);
      gl.uniform3f(fu.u_spec, specX, specY, specO);
      gl.uniform1f(fu.u_alpha, op);
      gl.uniform1f(fu.u_matte, this.look.matte ?? 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, c.tex[back ? 1 : 0]);
      gl.uniform1i(fu.u_tex, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    });

    if (!busy) this.last = 0;
    return busy;
  }
}
