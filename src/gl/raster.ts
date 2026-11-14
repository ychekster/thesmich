/*
 * Растр стороны карты (текст + простые плашки) для текстуры WebGL.
 *
 * Раскладку делает сам браузер: вызывающий строит невидимую DOM-копию стороны
 * с обычными CSS-классами (поля, flex, text-wrap: balance, медиа-запросы),
 * мы берём положение каждого символа через Range и рисуем символ в canvas
 * ровно туда же. Так переносы и отступы совпадают с DOM-версией, а тексты
 * по-прежнему правятся только в src/content/.
 *
 * Что умеет:
 * - текст любых элементов (шрифт и цвет — из вычисленного стиля,
 *   text-transform: uppercase учитывается);
 * - data-rot — элемент повёрнут на 180° вокруг своего центра (нижняя масть);
 * - data-paint — плашка: заливка background-color, рамка border-top,
 *   скругление border-radius (полоса, чип, поле подписи на визитке).
 * - painted(el, fn) — элемент рисует себя сам (QR, штрих-код, узор, портрет):
 *   fn получает контекст, уже сдвинутый в левый верхний угол элемента, и его
 *   размер в css px; рисовать векторно — чётко при любой плотности экрана.
 * Рисуется в порядке документа: плашка, затем то, что внутри неё.
 */

/** Готовые растры двух сторон одной карты. */
export interface FaceRaster { front: HTMLCanvasElement; back: HTMLCanvasElement }

export interface RasterFace {
  /** Корневой элемент, который кладём в невидимый контейнер (с размерами). */
  box: HTMLElement;
  /** Сторона карты внутри box — от её левого верхнего угла считаются координаты. */
  face: HTMLElement;
  w: number; h: number; // css px
}

/** Рисует содержимое элемента: контекст сдвинут в его угол, w × h — размер в css px. */
export type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
const painters = new WeakMap<Element, Painter>();

/** Пометить элемент: при растре его нарисует fn (см. Painter). Возвращает элемент. */
export function painted<T extends HTMLElement>(el: T, fn: Painter): T {
  painters.set(el, fn);
  return el;
}

const fontOf = (cs: CSSStyleDeclaration) => `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;

function radiusOf(cs: CSSStyleDeclaration, w: number, h: number) {
  const v = cs.borderTopLeftRadius;
  const n = parseFloat(v) || 0;
  return v.endsWith("%") ? (n / 100) * Math.min(w, h) : n;
}

/** Растеризует стороны; sample — текст, по которому догружаются начертания шрифта. */
export async function rasterDom(faces: RasterFace[], dpr: number, sample: string): Promise<HTMLCanvasElement[]> {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;z-index:-1;contain:layout style";
  faces.forEach(f => host.append(f.box));
  document.body.append(host);

  try {
    // дождаться нужных начертаний (подмножества шрифта грузятся лениво)
    const loads = new Set<string>();
    host.querySelectorAll("*").forEach(el => { if (el.textContent) loads.add(fontOf(getComputedStyle(el))); });
    await Promise.all([...loads].map(f => document.fonts.load(f, sample).catch(() => [])));

    const range = document.createRange();
    const ascent = new Map<string, number>();
    const out: HTMLCanvasElement[] = [];

    for (const { face, w, h } of faces) {
      const cv = document.createElement("canvas");
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      const ctx = cv.getContext("2d")!;
      ctx.scale(cv.width / w, cv.height / h);
      ctx.textBaseline = "alphabetic";
      const fr = face.getBoundingClientRect();

      const walker = document.createTreeWalker(face, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (n instanceof HTMLElement) {
          const painter = painters.get(n);
          if (painter) {
            const b = n.getBoundingClientRect();
            const op = parseFloat(getComputedStyle(n).opacity);
            ctx.save();
            ctx.translate(b.left - fr.left, b.top - fr.top);
            ctx.globalAlpha = Number.isFinite(op) ? op : 1;
            painter(ctx, b.width, b.height);
            ctx.restore();
            continue;
          }
          if (n.dataset.paint === undefined) continue;
          const cs = getComputedStyle(n);
          const b = n.getBoundingClientRect();
          const r = radiusOf(cs, b.width, b.height);
          ctx.beginPath();
          ctx.roundRect(b.left - fr.left, b.top - fr.top, b.width, b.height, r);
          ctx.fillStyle = cs.backgroundColor;
          ctx.fill();
          const bw = parseFloat(cs.borderTopWidth) || 0;
          if (bw > 0) {
            ctx.beginPath();
            ctx.roundRect(b.left - fr.left + bw / 2, b.top - fr.top + bw / 2, b.width - bw, b.height - bw, Math.max(0, r - bw / 2));
            ctx.lineWidth = bw;
            ctx.strokeStyle = cs.borderTopColor;
            ctx.stroke();
          }
          continue;
        }
        const t = n as Text;
        const parent = t.parentElement!;
        const cs = getComputedStyle(parent);
        const font = fontOf(cs);
        ctx.font = font;
        ctx.fillStyle = cs.color;
        if (!ascent.has(font)) ascent.set(font, ctx.measureText("H").fontBoundingBoxAscent);
        const asc = ascent.get(font)!;

        // повёрнутый на 180° элемент (нижняя масть) — вокруг центра своего блока
        const rot = parent.dataset.rot !== undefined;
        if (rot) {
          const b = parent.getBoundingClientRect();
          const cx = b.left + b.width / 2 - fr.left, cy = b.top + b.height / 2 - fr.top;
          ctx.save();
          ctx.translate(cx, cy); ctx.rotate(Math.PI); ctx.translate(-cx, -cy);
        }
        const text = t.data;
        const upper = cs.textTransform === "uppercase"; // Range даёт места заглавных — рисуем заглавные
        for (let i = 0; i < text.length;) {
          const cp = text.codePointAt(i)!;
          const len = cp > 0xffff ? 2 : 1;
          const ch = upper ? text.slice(i, i + len).toUpperCase() : text.slice(i, i + len);
          if (!/\s/.test(ch)) {
            range.setStart(t, i);
            range.setEnd(t, i + len);
            const r = range.getClientRects()[0];
            if (r) ctx.fillText(ch, r.left - fr.left, r.top - fr.top + asc);
          }
          i += len;
        }
        if (rot) ctx.restore();
      }
      out.push(cv);
    }
    return out;
  } finally {
    host.remove();
    faces.forEach(f => f.box.remove());
  }
}
