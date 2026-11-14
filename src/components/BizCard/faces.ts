import { card } from "../../content/card";
import { site } from "../../content/site";
import { rasterDom, type FaceRaster } from "../../gl/raster";
import s from "./BizCard.module.css";

/*
 * Стороны визитки. Одна и та же разметка идёт в текстуру WebGL (через
 * gl/raster.ts) и в DOM-версию без WebGL — вид совпадает.
 * Плашки (чип, полоса, поле подписи, точка) помечены data-paint.
 */

function el(tag: string, cls: string, text?: string, paint = false) {
  const e = document.createElement(tag);
  e.className = cls;
  if (text) e.textContent = text;
  if (paint) e.dataset.paint = "";
  return e;
}

export function buildFace(back: boolean): HTMLElement {
  const face = el("div", `${s.face} ${back ? s.back : s.front}`);
  if (!back) {
    const top = el("div", s.top);
    const logo = el("span", s.logo, site.brand);
    logo.append(el("span", s.dot, "."));
    top.append(logo, el("span", s.kicker, card.front.kicker));

    const chip = el("div", s.chip, "", true);
    chip.append(el("i", `${s.chipLine} ${s.l1}`, "", true), el("i", `${s.chipLine} ${s.l2}`, "", true), el("i", s.chipPad, "", true));

    const bottom = el("div", s.bottom);
    for (const f of card.front.fields) {
      const field = el("div", s.field);
      field.append(el("span", s.lbl, f.label), el("span", s.val, f.value));
      bottom.append(field);
    }
    bottom.append(el("span", s.mark, "", true));

    face.append(top, chip, el("p", s.number, card.front.number), bottom);
  } else {
    const sign = el("div", s.sign);
    const box = el("div", s.signBox, "", true);
    box.append(el("span", s.signText, card.back.signature));
    const cvc = el("div", s.cvc, "", true);
    cvc.append(el("span", s.cvcText, card.back.code));
    sign.append(box, cvc);

    const list = el("div", s.contacts);
    for (const c of card.back.contacts) {
      const row = el("div", s.contact);
      row.append(el("span", s.lbl, c.label), el("span", s.cval, c.value));
      list.append(row);
    }
    face.append(el("div", s.stripe, "", true), sign, list, el("p", s.note, card.back.note));
  }
  return face;
}

/** Растр обеих сторон под размер карты (для CardsRenderer). */
export async function rasterBizCard(sizes: { w: number; h: number }[], dpr: number): Promise<FaceRaster[]> {
  const { w, h } = sizes[0];
  const faces = [false, true].map(back => {
    const box = el("div", s.box);
    box.style.cssText = `width:${w}px;height:${h}px`;
    const face = buildFace(back);
    box.append(face);
    return { box, face, w, h };
  });
  const sample = [site.brand, card.front.kicker, card.front.number, ...card.front.fields.flatMap(f => [f.label, f.value]),
    card.back.code, card.back.note, ...card.back.contacts.flatMap(c => [c.label, c.value])].join("");
  const [front, back] = await rasterDom(faces, dpr, sample);
  return [{ front, back }];
}
