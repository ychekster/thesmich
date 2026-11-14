import type { FaqCard } from "../../../types";
import s from "../FaqCards.module.css";

/*
 * Растр содержимого сторон карты (масти + текст) для текстур WebGL.
 *
 * Раскладку делает сам браузер: строим невидимую копию стороны карты с теми же
 * CSS-классами (поля, flex-центровка, text-wrap: balance, размеры шрифта),
 * берём положение каждого символа через Range и рисуем символ в canvas ровно
 * туда же. Так переносы и отступы совпадают с DOM-версией пиксель в пиксель,
 * а тексты по-прежнему правятся только в src/content/faq.ts.
 */

export interface FaceRaster { front: HTMLCanvasElement; back: HTMLCanvasElement }

function faceElement(card: FaqCard, back: boolean) {
  const red = card.suit === "♥" || card.suit === "♦";
  const face = document.createElement("div");
  face.className = `${s.face} ${back ? s.back : s.front}`;
  face.style.transform = "none"; // у оборота в CSS rotateY(180deg) — здесь меряем без поворота
  const suit = (corner: boolean) => {
    const el = document.createElement("span");
    el.className = `${s.suit} ${corner ? s.br : ""} ${red ? s.red : ""}`;
    el.textContent = card.suit;
    if (corner) { el.style.transform = "none"; el.dataset.rot = ""; } // нижняя масть рисуется повёрнутой
    return el;
  };
  face.append(suit(false), suit(true));
  const q = document.createElement("p");
  q.className = back ? s.q2 : s.q;
  q.textContent = card.q;
  face.append(q);
  if (back) {
    const a = document.createElement("p");
    a.className = s.a;
    a.textContent = card.a;
    face.append(a);
  }
  return face;
}

const fontOf = (cs: CSSStyleDeclaration) => `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;

/** Растеризует обе стороны всех карт. size — размер каждой карты в css px. */
export async function rasterFaces(cards: FaqCard[], sizes: { w: number; h: number }[], dpr: number): Promise<FaceRaster[]> {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;z-index:-1;contain:layout style";
  const faces: { el: HTMLElement; w: number; h: number }[] = [];
  cards.forEach((card, i) => {
    for (const back of [false, true]) {
      const box = document.createElement("div");
      box.className = s.flip;
      box.style.cssText = `width:${sizes[i].w}px;height:${sizes[i].h}px;min-height:0;aspect-ratio:auto;transform:none;transition:none`;
      const el = faceElement(card, back);
      box.append(el);
      host.append(box);
      faces.push({ el, ...sizes[i] });
    }
  });
  document.body.append(host);

  try {
    // дождаться нужных начертаний (подмножества шрифта грузятся лениво)
    const loads = new Set<string>();
    host.querySelectorAll("p, span").forEach(el => loads.add(fontOf(getComputedStyle(el))));
    const sample = cards.map(c => c.q + c.a).join("");
    await Promise.all([...loads].map(f => document.fonts.load(f, sample).catch(() => [])));

    const range = document.createRange();
    const ascent = new Map<string, number>();
    const out: HTMLCanvasElement[] = [];

    for (const { el, w, h } of faces) {
      const cv = document.createElement("canvas");
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      const ctx = cv.getContext("2d")!;
      ctx.scale(cv.width / w, cv.height / h);
      ctx.textBaseline = "alphabetic";
      const fr = el.getBoundingClientRect();

      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
        const parent = n.parentElement!;
        const cs = getComputedStyle(parent);
        const font = fontOf(cs);
        ctx.font = font;
        ctx.fillStyle = cs.color;
        if (!ascent.has(font)) ascent.set(font, ctx.measureText("H").fontBoundingBoxAscent);
        const asc = ascent.get(font)!;

        // нижняя масть повёрнута на 180° вокруг центра своего блока
        const rot = parent.dataset.rot !== undefined;
        if (rot) {
          const b = parent.getBoundingClientRect();
          const cx = b.left + b.width / 2 - fr.left, cy = b.top + b.height / 2 - fr.top;
          ctx.save();
          ctx.translate(cx, cy); ctx.rotate(Math.PI); ctx.translate(-cx, -cy);
        }
        const text = n.data;
        for (let i = 0; i < text.length;) {
          const cp = text.codePointAt(i)!;
          const len = cp > 0xffff ? 2 : 1;
          const ch = text.slice(i, i + len);
          if (!/\s/.test(ch)) {
            range.setStart(n, i);
            range.setEnd(n, i + len);
            const r = range.getClientRects()[0];
            if (r) ctx.fillText(ch, r.left - fr.left, r.top - fr.top + asc);
          }
          i += len;
        }
        if (rot) ctx.restore();
      }
      out.push(cv);
    }

    const res: FaceRaster[] = [];
    for (let i = 0; i < out.length; i += 2) res.push({ front: out[i], back: out[i + 1] });
    return res;
  } finally {
    host.remove();
  }
}
