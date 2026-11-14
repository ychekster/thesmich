import { rasterDom, type FaceRaster, type RasterFace } from "../../../gl/raster";
import type { FaqCard } from "../../../types";
import s from "../FaqCards.module.css";

/*
 * Стороны карт частых вопросов для текстур WebGL: строим невидимую DOM-копию
 * стороны с теми же CSS-классами, что у DOM-карт, а рисует её gl/raster.ts.
 */

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

/** Растеризует обе стороны всех карт. size — размер каждой карты в css px. */
export async function rasterFaces(cards: FaqCard[], sizes: { w: number; h: number }[], dpr: number): Promise<FaceRaster[]> {
  const faces: RasterFace[] = [];
  cards.forEach((card, i) => {
    for (const back of [false, true]) {
      const box = document.createElement("div");
      box.className = s.flip;
      box.style.cssText = `width:${sizes[i].w}px;height:${sizes[i].h}px;min-height:0;aspect-ratio:auto;transform:none;transition:none`;
      const face = faceElement(card, back);
      box.append(face);
      faces.push({ box, face, ...sizes[i] });
    }
  });
  const out = await rasterDom(faces, dpr, cards.map(c => c.q + c.a).join(""));
  const res: FaceRaster[] = [];
  for (let i = 0; i < out.length; i += 2) res.push({ front: out[i], back: out[i + 1] });
  return res;
}
