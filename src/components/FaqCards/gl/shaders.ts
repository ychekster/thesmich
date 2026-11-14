import { GLSL } from "../../../gl/core";

/*
 * Шейдеры карт. Повторяют прежнюю CSS-вёрстку один в один:
 * - проекция = CSS perspective: 1100px, rotateX/rotateY, scale;
 * - фон, кромки (inset box-shadow) и блик — те же градиенты, что были в
 *   FaqCards.module.css (.front/.back/.spec/.specBack), посчитанные в шейдере;
 * - текст и масти — текстура, нарисованная по раскладке DOM (faces.ts);
 * - тень — аналитическое гауссово размытие скруглённого прямоугольника
 *   (как filter: blur(28px)). Считается ОДИН раз в текстуру (запекание),
 *   в кадре рисуется готовая картинка (SPRITE_*): считать её каждый кадр
 *   для 4 карт было слишком дорого для встроенных видеокарт.
 * Все координаты — CSS-пиксели, ось Y вниз.
 */

export const FACE_VS = /* glsl */ `#version 300 es
in vec2 a_uv;
uniform vec2 u_res;      // размер холста, css px
uniform vec2 u_center;   // центр карты на холсте, css px
uniform vec2 u_size;     // размер карты, css px
uniform vec3 u_rot;      // rotateX, rotateY (рад), scale
uniform float u_persp;   // perspective, px
uniform float u_dealY;   // сдвиг раздачи, px
out vec2 v_q;            // точка на карте, css px от левого верхнего угла
void main() {
  vec2 p = (a_uv - 0.5) * u_size * u_rot.z;
  float cx = cos(u_rot.x), sx = sin(u_rot.x);
  float cy = cos(u_rot.y), sy = sin(u_rot.y);
  // CSS: rotateX(a) rotateY(b) → к точке сначала rotateY, потом rotateX
  vec3 v = vec3(cy * p.x, p.y, -sy * p.x);
  v = vec3(v.x, cx * v.y - sx * v.z, sx * v.y + cx * v.z);
  float w = 1.0 - v.z / u_persp;
  vec2 s = u_center + vec2(0.0, u_dealY) + v.xy / w;
  vec2 ndc = vec2(s.x / u_res.x * 2.0 - 1.0, 1.0 - s.y / u_res.y * 2.0);
  gl_Position = vec4(ndc * w, 0.0, w);   // w — перспективно-верная интерполяция
  v_q = a_uv * u_size;
}`;

export const FACE_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_q;
uniform vec2 u_size;
uniform float u_back;    // 0 — лицо, 1 — оборот
uniform vec3 u_spec;     // сдвиг блика x, y (px) и его opacity
uniform float u_alpha;   // прозрачность раздачи
uniform sampler2D u_tex; // текст и масти (предумноженная альфа)
out vec4 o;
${GLSL.sdRoundRect}

// линейный градиент CSS: угол (0deg — вверх, по часовой), точка от центра
float gradT(vec2 p, vec2 box, float deg) {
  float a = radians(deg);
  vec2 d = vec2(sin(a), -cos(a));
  return dot(p, d) / (abs(box.x * sin(a)) + abs(box.y * cos(a))) + 0.5;
}
float seg(float t, float t0, float a0, float t1, float a1) {
  return mix(a0, a1, clamp((t - t0) / (t1 - t0), 0.0, 1.0));
}

void main() {
  vec2 c = u_size * 0.5;
  vec2 p = v_q - c;
  float mask = cover(sdRoundRect(p, c, 26.0));
  if (mask <= 0.0) discard;
  bool back = u_back > 0.5;

  // фон: цвет + linear-gradient(155deg, ...) — интерполяция в предумноженной альфе
  float t = gradT(p, u_size, 155.0);
  vec3 col;
  if (!back) {
    vec4 g = t < 0.38 ? mix(vec4(vec3(0.07), 0.07), vec4(0.0), t / 0.38)
                      : mix(vec4(0.0), vec4(0.0, 0.0, 0.0, 0.35), (t - 0.38) / 0.62);
    col = vec3(20.0, 20.0, 22.0) / 255.0 * (1.0 - g.a) + g.rgb;
  } else {
    vec4 g = t < 0.45 ? mix(vec4(vec3(0.9), 0.9), vec4(0.0), t / 0.45)
                      : mix(vec4(0.0), vec4(0.0, 0.0, 0.0, 0.08), (t - 0.45) / 0.55);
    col = vec3(236.0, 236.0, 240.0) / 255.0 * (1.0 - g.a) + g.rgb;
  }

  // кромки: inset 0 0 0 1px (кольцо) и поверх inset 0 1px 0 (светлая полоска сверху)
  float ring = 1.0 - cover(sdRoundRect(p, c - 1.0, 25.0));
  float top = 1.0 - cover(sdRoundRect(p - vec2(0.0, 1.0), c, 26.0));
  col = back ? mix(col, vec3(0.0), 0.05 * ring) : mix(col, vec3(1.0), 0.06 * ring);
  col = back ? mix(col, vec3(1.0), 1.0 * top) : mix(col, vec3(1.0), 0.14 * top);

  // блик: слой на 40% больше карты со всех сторон, сдвигается и меняет яркость
  vec2 S = u_size * 1.8;
  vec2 sp = v_q + u_size * 0.4 - u_spec.xy;
  vec2 rc = back ? vec2(0.64, 0.30) : vec2(0.36, 0.30);
  float rt = length((sp - rc * S) / (vec2(0.34, 0.24) * S));
  float aR = back
    ? (rt < 0.45 ? seg(rt, 0.0, 0.95, 0.45, 0.35) : seg(rt, 0.45, 0.35, 0.72, 0.0))
    : (rt < 0.45 ? seg(rt, 0.0, 0.16, 0.45, 0.05) : seg(rt, 0.45, 0.05, 0.72, 0.0));
  float lt = gradT(sp - S * 0.5, S, back ? 62.0 : 118.0);
  float aL;
  if (back) {
    aL = lt < 0.48 ? seg(lt, 0.41, 0.0, 0.48, 0.45)
       : lt < 0.50 ? seg(lt, 0.48, 0.45, 0.50, 0.7)
       : lt < 0.52 ? seg(lt, 0.50, 0.7, 0.52, 0.45)
       : seg(lt, 0.52, 0.45, 0.59, 0.0);
  } else {
    aL = lt < 0.47 ? seg(lt, 0.41, 0.0, 0.47, 0.06)
       : lt < 0.50 ? seg(lt, 0.47, 0.06, 0.50, 0.10)
       : lt < 0.53 ? seg(lt, 0.50, 0.10, 0.53, 0.06)
       : seg(lt, 0.53, 0.06, 0.59, 0.0);
  }
  col = mix(col, vec3(1.0), (aR + aL * (1.0 - aR)) * u_spec.z);

  // текст и масти поверх блика
  vec4 tx = texture(u_tex, v_q / u_size);
  col = col * (1.0 - tx.a) + tx.rgb;

  float a = mask * u_alpha;
  o = vec4(col * a, a);
}`;

export const SHADOW_VS = /* glsl */ `#version 300 es
in vec2 a_uv;
uniform vec2 u_res;
uniform vec4 u_rect;     // x, y, w, h тени (css px на холсте)
uniform float u_sigma;
out vec2 v_p;
void main() {
  vec2 lo = u_rect.xy - 3.0 * u_sigma;
  vec2 s = lo + a_uv * (u_rect.zw + 6.0 * u_sigma);
  v_p = s;
  gl_Position = vec4(s.x / u_res.x * 2.0 - 1.0, 1.0 - s.y / u_res.y * 2.0, 0.0, 1.0);
}`;

/* Размытый скруглённый прямоугольник: точная свёртка по X через erf,
   по Y — 16 отсчётов (метод Эвана Уоллеса). */
export const SHADOW_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_p;
uniform vec4 u_rect;
uniform float u_sigma;
uniform float u_radius;
uniform float u_alpha;
out vec4 o;
float gaussian(float x, float s) { return exp(-(x * x) / (2.0 * s * s)) / (2.5066283 * s); }
vec2 erf2(vec2 x) {
  vec2 s = sign(x), a = abs(x);
  x = 1.0 + (0.278393 + (0.230389 + 0.078108 * (a * a)) * a) * a;
  x *= x;
  return s - s / (x * x);
}
float boxX(float x, float y, float s, float r, vec2 hs) {
  float d = min(hs.y - r - abs(y), 0.0);
  float curved = hs.x - r + sqrt(max(0.0, r * r - d * d));
  vec2 i = 0.5 + 0.5 * erf2((x + vec2(-curved, curved)) * (0.70710678 / s));
  return i.y - i.x;
}
void main() {
  vec2 hs = u_rect.zw * 0.5;
  vec2 p = v_p - (u_rect.xy + hs);
  float lo = p.y - hs.y, hi = p.y + hs.y;
  float st = clamp(-3.0 * u_sigma, lo, hi), en = clamp(3.0 * u_sigma, lo, hi);
  float step = (en - st) / 16.0;
  float y = st + step * 0.5, v = 0.0;
  for (int i = 0; i < 16; i++) {
    v += boxX(p.x, p.y - y, u_sigma, u_radius, hs) * gaussian(y, u_sigma) * step;
    y += step;
  }
  float a = v * u_alpha;
  o = vec4(0.0, 0.0, 0.0, a);
}`;

/* Готовая текстура (запечённая тень) в прямоугольнике холста. Текстура
   отрисована в framebuffer, поэтому её верх — у v = 1. */
export const SPRITE_VS = /* glsl */ `#version 300 es
in vec2 a_uv;
uniform vec2 u_res;
uniform vec4 u_rect;
out vec2 v_uv;
void main() {
  vec2 s = u_rect.xy + a_uv * u_rect.zw;
  v_uv = vec2(a_uv.x, 1.0 - a_uv.y);
  gl_Position = vec4(s.x / u_res.x * 2.0 - 1.0, 1.0 - s.y / u_res.y * 2.0, 0.0, 1.0);
}`;

export const SPRITE_FS = /* glsl */ `#version 300 es
precision mediump float;
in vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_alpha;
out vec4 o;
void main() { o = texture(u_tex, v_uv) * u_alpha; }`;
