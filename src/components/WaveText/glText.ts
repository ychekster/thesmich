import { canvasDpr, createGl, createLoop, program, renderTarget, textureFrom, unitQuad, type GL, type Program } from "../../gl/core";
import { bezier, clamp } from "../../gl/motion";
import type { Letter } from "./engine";

/*
 * Буквы WaveText на WebGL (огромный логотип в футере).
 *
 * DOM-буквы остаются (невидимые): по ним браузер делает раскладку, их меряет
 * движок курсора, их читают экранные дикторы. Холст поверх рисует глифы из
 * атласа. Появление «из размытия» не размывает ничего покадрово: при загрузке
 * видеокарта один раз считает 4 уровня размытия (0, 3.5, 7, 14px) и кладёт их
 * в каналы R/G/B/A одной текстуры, а в анимации шейдер просто смешивает
 * соседние уровни. Кадры идут только во время появления и толчков курсора.
 *
 * Анимация — точная копия CSS letter-in из WaveText.module.css:
 * 1.1s, cubic-bezier(.2,.9,.25,1.12); transform от translateY(.55em)
 * rotate(10deg) scale(.85) до нуля за всё время; opacity и blur(14px) — за
 * первые 60% (кривая на каждом отрезке ключевых кадров своя, как в CSS).
 */

const BLUR = [0, 3.5, 7, 14];             // css px, уровни в каналах R, G, B, A
const DUR = 1100;
const curve = bezier(0.2, 0.9, 0.25, 1.12);

interface Glyph {
  ch: string;
  color: [number, number, number];
  bx: number; by: number; bw: number; bh: number; // блок буквы (.ch) на холсте, css px
  gx: number; gy: number;                          // начало глифа (база) от блока, css px
  off: [number, number, number, number];           // ячейка относительно блока: x, y, w, h (css px)
  cell: [number, number, number, number];          // ячейка атласа, px атласа
}

export interface GlTextOptions {
  step: number;   // задержка между буквами, мс
  delay: number;  // задержка до первой буквы, мс
  reduced: boolean;
}

const BLUR_VS = /* glsl */ `#version 300 es
in vec2 a_uv;
out vec2 v_uv;
void main() { v_uv = a_uv; gl_Position = vec4(a_uv * 2.0 - 1.0, 0.0, 1.0); }`;

/* Разделимое гауссово размытие одного канала. Вход уже гладкий для крупных
   уровней (берём предыдущий уровень), поэтому шаг отсчётов можно растянуть. */
const BLUR_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_src;
uniform vec4 u_pick;     // какой канал читать
uniform vec2 u_dir;      // направление, в текселях
uniform float u_sigma;   // в текселях
uniform float u_step;    // шаг отсчётов, в текселях
out vec4 o;
void main() {
  if (u_sigma < 0.01) { o = vec4(dot(texture(u_src, v_uv), u_pick)); return; }
  float sum = 0.0, wsum = 0.0;
  float r = ceil(3.0 * u_sigma / u_step);
  for (float i = -r; i <= r; i += 1.0) {
    float x = i * u_step;
    float w = exp(-(x * x) / (2.0 * u_sigma * u_sigma));
    sum += dot(texture(u_src, v_uv + u_dir * x), u_pick) * w;
    wsum += w;
  }
  o = vec4(sum / wsum);
}`;

const GLYPH_VS = /* glsl */ `#version 300 es
in vec2 a_uv;
uniform vec2 u_res;
uniform vec4 u_box;      // блок буквы: x, y, w, h (css px на холсте)
uniform vec4 u_off;      // ячейка относительно блока: x, y, w, h (css px)
uniform vec4 u_cell;     // ячейка атласа в uv
uniform vec4 u_push;     // толчок курсора: x, y (px), поворот (рад); 4-й — не используется
uniform vec3 u_in;       // появление: сдвиг Y (px), поворот (рад), масштаб
out vec2 v_uv;
vec2 rot(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
void main() {
  vec2 p = u_off.xy + a_uv * u_off.zw - u_box.zw * 0.5; // от центра блока (transform-origin)
  p = rot(p * u_in.z, u_in.y) + vec2(0.0, u_in.x);      // .in: translate rotate scale
  p = rot(p, u_push.z) + u_push.xy;                     // .ch: translate rotate
  vec2 s = u_box.xy + u_box.zw * 0.5 + p;
  gl_Position = vec4(s.x / u_res.x * 2.0 - 1.0, 1.0 - s.y / u_res.y * 2.0, 0.0, 1.0);
  v_uv = u_cell.xy + a_uv * u_cell.zw;
}`;

const GLYPH_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_atlas;
uniform vec3 u_color;
uniform float u_blur;    // 0..3 — позиция между уровнями R, G, B, A
uniform float u_alpha;
out vec4 o;
void main() {
  vec4 t = texture(u_atlas, v_uv);
  float b = clamp(u_blur, 0.0, 3.0);
  float a = b < 1.0 ? mix(t.r, t.g, b) : b < 2.0 ? mix(t.g, t.b, b - 1.0) : mix(t.b, t.a, b - 2.0);
  a *= u_alpha;
  o = vec4(u_color * a, a);
}`;

const BLUR_U = ["u_src", "u_pick", "u_dir", "u_sigma", "u_step"] as const;
const GLYPH_U = ["u_res", "u_box", "u_off", "u_cell", "u_push", "u_in", "u_atlas", "u_color", "u_blur", "u_alpha"] as const;

export class GlTextLayer {
  private gl: GL | null;
  private blurP!: Program<typeof BLUR_U[number]>;
  private glyphP!: Program<typeof GLYPH_U[number]>;
  private vao!: WebGLVertexArrayObject;
  private atlas: WebGLTexture | null = null;
  private atlasW = 1; private atlasH = 1;
  private glyphs: Glyph[] = [];
  private cssW = 0; private cssH = 0;
  private fontSize = 0;
  private playAt = -1;
  private ready = false;
  private buildId = 0;
  private buildTimer = 0;
  private dead = false;
  private loop = createLoop(now => this.frame(now));
  private ro: ResizeObserver;
  /** Смещения букв от движка курсора (тот же порядок, что и DOM-буквы). */
  letters: Letter[] = [];

  constructor(private canvas: HTMLCanvasElement, private root: HTMLElement, private opts: GlTextOptions) {
    this.gl = createGl(canvas);
    if (this.gl) {
      try { this.initGl(); } catch (e) { console.warn(e); this.gl = null; }
    }
    canvas.addEventListener("webglcontextlost", this.onLost);
    canvas.addEventListener("webglcontextrestored", this.onRestored);
    this.ro = new ResizeObserver(() => this.schedule());
    this.ro.observe(root);
  }

  get ok() { return !!this.gl; }

  private initGl() {
    const gl = this.gl!;
    this.blurP = program(gl, BLUR_VS, BLUR_FS, BLUR_U);
    this.glyphP = program(gl, GLYPH_VS, GLYPH_FS, GLYPH_U);
    this.vao = unitQuad(gl);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  private onLost = (e: Event) => { e.preventDefault(); this.loop.stop(); this.ready = false; };
  private onRestored = () => {
    this.gl = createGl(this.canvas);
    if (!this.gl) return;
    this.atlas = null;
    this.initGl();
    this.schedule(0);
  };

  /** Начать появление букв. */
  play() {
    this.playAt = this.opts.reduced ? -1e9 : performance.now();
    this.loop.invalidate();
  }
  /** Движок курсора сдвинул буквы — перерисовать. */
  invalidate = () => this.loop.invalidate();

  private schedule(ms = this.ready ? 150 : 0) {
    clearTimeout(this.buildTimer);
    this.buildTimer = window.setTimeout(() => void this.build(), ms);
  }

  /** Раскладка по DOM → атлас глифов → уровни размытия на видеокарте. */
  private async build() {
    const gl = this.gl;
    if (!gl || this.dead) return;
    const id = ++this.buildId;
    const cs = getComputedStyle(this.root);
    const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    await document.fonts.load(font, this.root.getAttribute("aria-label") ?? "").catch(() => []);
    if (id !== this.buildId || this.dead) return;

    // холст: блок текста + поля под толчок курсора, размытие и вылет снизу
    const fs = parseFloat(cs.fontSize);
    this.fontSize = fs;
    const r = this.root.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const reach = 130 + 3 * BLUR[3];                  // толчок до 120px + размытие
    const padL = Math.max(0, Math.min(reach, r.left));
    const padR = Math.max(0, Math.min(reach, vw - r.right));
    const padT = reach, padB = reach + 0.55 * fs;
    this.cssW = r.width + padL + padR;
    this.cssH = r.height + padT + padB;
    Object.assign(this.canvas.style, {
      left: `${-padL}px`, top: `${-padT}px`, width: `${this.cssW}px`, height: `${this.cssH}px`,
    });
    const dpr = canvasDpr(gl, this.cssW, this.cssH);
    this.canvas.width = Math.round(this.cssW * dpr);
    this.canvas.height = Math.round(this.cssH * dpr);

    // глифы: положение блока каждой буквы и её базовой линии — из DOM
    const cv = document.createElement("canvas");
    const ctx = cv.getContext("2d")!;
    ctx.font = font;
    const asc = ctx.measureText("H").fontBoundingBoxAscent;
    const range = document.createRange();
    const m = 3 * BLUR[3] + 2;                        // поле ячейки под размытие
    const els = [...this.root.querySelectorAll<HTMLElement>("[data-ch]")];
    const maxW = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE) as number, 4096);
    let x = 0, y = 0, rowH = 0;
    this.glyphs = els.map(el => {
      const b = el.getBoundingClientRect();
      const node = el.firstElementChild!.firstChild as Text;
      range.selectNodeContents(node);
      const g = range.getClientRects()[0] ?? b;
      const c = getComputedStyle(el).color.match(/[\d.]+/g)!.map(Number);
      // ячейка — по реальному контуру глифа (а не по блоку) + поле под размытие
      const gx = g.left - b.left, gy = g.top - b.top + asc;
      const mt = ctx.measureText(node.data);
      const off: Glyph["off"] = [
        gx - mt.actualBoundingBoxLeft - m, gy - mt.actualBoundingBoxAscent - m,
        mt.actualBoundingBoxLeft + mt.actualBoundingBoxRight + 2 * m,
        mt.actualBoundingBoxAscent + mt.actualBoundingBoxDescent + 2 * m,
      ];
      const cw = Math.ceil(off[2] * dpr) + 2, ch = Math.ceil(off[3] * dpr) + 2;
      if (x + cw > maxW) { x = 0; y += rowH; rowH = 0; }
      const cell: Glyph["cell"] = [x, y, cw, ch];
      x += cw; rowH = Math.max(rowH, ch);
      return {
        ch: node.data,
        color: [c[0] / 255, c[1] / 255, c[2] / 255] as [number, number, number],
        bx: b.left - r.left + padL, by: b.top - r.top + padT, bw: b.width, bh: b.height,
        gx, gy, off, cell,
      };
    });
    this.atlasW = Math.max(1, x > 0 ? Math.max(x, ...this.glyphs.map(g => g.cell[0] + g.cell[2])) : 1);
    this.atlasH = Math.max(1, y + rowH);
    cv.width = this.atlasW; cv.height = this.atlasH;
    ctx.font = font;
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "alphabetic";
    for (const g of this.glyphs) {
      ctx.save();
      ctx.translate(g.cell[0], g.cell[1]);
      ctx.scale(g.cell[2] / g.off[2], g.cell[3] / g.off[3]);
      ctx.fillText(g.ch, g.gx - g.off[0], g.gy - g.off[1]);
      ctx.restore();
    }
    this.blurAtlas(cv, dpr);
    this.ready = true;
    this.loop.invalidate();
  }

  /** Уровни размытия: каждый следующий — из предыдущего (вход гладкий → редкие отсчёты). */
  private blurAtlas(src: HTMLCanvasElement, dpr: number) {
    const gl = this.gl!;
    const W = this.atlasW, H = this.atlasH;
    const sharp = textureFrom(gl, src);
    const tmp = renderTarget(gl, W, H);
    const levels = BLUR.slice(1).map(() => renderTarget(gl, W, H));
    const out = renderTarget(gl, W, H);
    const p = this.blurP;
    gl.useProgram(p.prog);
    gl.bindVertexArray(this.vao);
    gl.disable(gl.BLEND);
    gl.viewport(0, 0, W, H);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(p.u.u_src, 0);
    const pass = (from: WebGLTexture, pick: number[], to: WebGLFramebuffer, dir: [number, number], sigma: number, step: number) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, to);
      gl.bindTexture(gl.TEXTURE_2D, from);
      gl.uniform4fv(p.u.u_pick, pick);
      gl.uniform2f(p.u.u_dir, dir[0] / W, dir[1] / H);
      gl.uniform1f(p.u.u_sigma, sigma);
      gl.uniform1f(p.u.u_step, step);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const A = [0, 0, 0, 1], R = [1, 0, 0, 0];
    let prev = sharp, prevPick = A, prevSigma = 0;
    BLUR.slice(1).forEach((b, i) => {
      const sigma = b * dpr;
      const inc = Math.sqrt(sigma * sigma - prevSigma * prevSigma); // гауссианы складываются квадратично
      const step = Math.max(1, prevSigma * 0.5);
      pass(prev, prevPick, tmp.fb, [1, 0], inc, step);
      pass(tmp.tex, R, levels[i].fb, [0, 1], inc, step);
      prev = levels[i].tex; prevPick = R; prevSigma = sigma;
    });
    // собрать: R — резкий, G/B/A — уровни
    gl.bindFramebuffer(gl.FRAMEBUFFER, out.fb);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const masks: [boolean, boolean, boolean, boolean][] = [[true, false, false, false], [false, true, false, false], [false, false, true, false], [false, false, false, true]];
    [sharp, ...levels.map(l => l.tex)].forEach((tex, i) => {
      gl.colorMask(...masks[i]);
      pass(tex, i === 0 ? A : R, out.fb, [0, 0], 0, 1);
    });
    gl.colorMask(true, true, true, true);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.enable(gl.BLEND);
    gl.deleteTexture(sharp);
    for (const t of [tmp, ...levels]) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fb); }
    gl.deleteFramebuffer(out.fb);
    if (this.atlas) gl.deleteTexture(this.atlas);
    this.atlas = out.tex;
  }

  private frame(now: number): boolean {
    const gl = this.gl;
    if (!gl || gl.isContextLost() || !this.ready || !this.atlas) return false;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (this.playAt < 0) return false; // до появления букв не видно

    const p = this.glyphP;
    gl.useProgram(p.prog);
    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.atlas);
    gl.uniform1i(p.u.u_atlas, 0);
    gl.uniform2f(p.u.u_res, this.cssW, this.cssH);
    const fs = this.fontSize;
    let busy = false;

    this.glyphs.forEach((g, i) => {
      const u = clamp((now - this.playAt - this.opts.delay - i * this.opts.step) / DUR, 0, 1);
      if (u < 1) busy = true;
      // opacity и blur — отрезок 0..60% со своей кривой; transform — весь отрезок
      const e1 = curve(clamp(u / 0.6, 0, 1));
      const alpha = clamp(e1, 0, 1);
      if (alpha <= 0) return;
      const blur = Math.max(0, BLUR[3] * (1 - e1));
      const e = curve(u);
      const l = this.letters[i];
      const lx = l?.x ?? 0, ly = l?.y ?? 0;

      gl.uniform4f(p.u.u_box, g.bx, g.by, g.bw, g.bh);
      gl.uniform4f(p.u.u_off, ...g.off);
      gl.uniform4f(p.u.u_cell, g.cell[0] / this.atlasW, g.cell[1] / this.atlasH, g.cell[2] / this.atlasW, g.cell[3] / this.atlasH);
      gl.uniform4f(p.u.u_push, lx, ly, (lx * 0.25 * Math.PI) / 180, 0);
      gl.uniform3f(p.u.u_in, 0.55 * fs * (1 - e), ((10 * Math.PI) / 180) * (1 - e), 0.85 + 0.15 * e);
      gl.uniform3f(p.u.u_color, ...g.color);
      gl.uniform1f(p.u.u_blur, blurLevel(blur));
      gl.uniform1f(p.u.u_alpha, alpha);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    });
    return busy;
  }

  destroy() {
    this.dead = true;
    this.loop.stop();
    clearTimeout(this.buildTimer);
    this.ro.disconnect();
    this.canvas.removeEventListener("webglcontextlost", this.onLost);
    this.canvas.removeEventListener("webglcontextrestored", this.onRestored);
    const gl = this.gl;
    if (gl && !gl.isContextLost() && this.vao) {
      if (this.atlas) gl.deleteTexture(this.atlas);
      gl.deleteProgram(this.blurP.prog);
      gl.deleteProgram(this.glyphP.prog);
      gl.deleteVertexArray(this.vao);
    }
    this.gl = null;
  }
}

/** Размытие в px → позиция между уровнями атласа (0..3). */
function blurLevel(b: number) {
  for (let i = 1; i < BLUR.length; i++) {
    if (b <= BLUR[i]) return i - 1 + (b - BLUR[i - 1]) / (BLUR[i] - BLUR[i - 1]);
  }
  return BLUR.length - 1;
}
