import qrcode from "qrcode-generator";
import { site } from "../../content/site";
import { idText, type Person } from "../../content/team";
import { painted, rasterDom, type FaceRaster, type Painter } from "../../gl/raster";
import s from "./IdCard.module.css";

/*
 * Стороны удостоверения. Раскладку делает CSS (IdCard.module.css, размеры в cqw),
 * графику — «художники» (painted из gl/raster.ts): гильош, портрет-монограмма,
 * QR, штрих-код. Растр идёт в текстуру WebGL, а без WebGL те же растры
 * показываются как обычные картинки — вид совпадает.
 */

function el(tag: string, cls: string, text?: string) {
  const e = document.createElement(tag);
  e.className = cls;
  if (text) e.textContent = text;
  return e;
}

// ---------- графика ----------

/** Защитный узор (гильош): пучок синусоид и розетка, едва заметные на мате. */
const guilloche: Painter = (ctx, w, h) => {
  const fade = ctx.createLinearGradient(w * 0.25, 0, w, 0);
  fade.addColorStop(0, "rgba(255,255,255,0)");
  fade.addColorStop(1, "rgba(255,255,255,.06)");
  ctx.strokeStyle = fade;
  ctx.lineWidth = Math.max(0.5, w / 1600);
  const lines = 26;
  for (let k = 0; k < lines; k++) {
    ctx.beginPath();
    const ph = (k / lines) * Math.PI * 2;
    for (let x = 0; x <= w; x += 4) {
      const t = x / w;
      const y = h * (0.56 + 0.22 * Math.sin(t * Math.PI * 2.2 + ph) * Math.sin(t * Math.PI * 0.9 + ph * 0.5));
      x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  // розетка (спирограф) в правом нижнем углу
  const R = Math.min(w, h) * 0.36, r = R * 0.27, d = R * 0.73; // d = R − r: розетка без «дыры» в центре
  const cx = w - R * 0.9, cy = h * 0.42;
  ctx.strokeStyle = "rgba(255,255,255,.026)";
  ctx.beginPath();
  for (let i = 0; i <= 2400; i++) {
    const t = (i / 2400) * Math.PI * 2 * 27;
    const x = cx + (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
    const y = cy + (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();
};

/** Портрет: фото (обрезка по центру) или монограмма, как в «Контактах» Apple. */
function portrait(p: Person, img: HTMLImageElement | null): Painter {
  return (ctx, w, h) => {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, w * 0.07);
    ctx.clip();
    if (img) {
      const k = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const iw = img.naturalWidth * k, ih = img.naturalHeight * k;
      ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#a5abb8");
      g.addColorStop(1, "#7d828e");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#fff";
      ctx.font = `700 ${w * 0.5}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.name.slice(0, 1).toUpperCase(), w / 2, h * 0.53);
    }
    ctx.restore();
  };
}

/** QR на белой плашке: ссылка на эту же страницу. */
function qr(url: string): Painter {
  const code = qrcode(0, "M");
  code.addData(url);
  code.make();
  const n = code.getModuleCount();
  return (ctx, w) => {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.roundRect(0, 0, w, w, w * 0.08);
    ctx.fill();
    const q = w * 0.09;              // тихая зона
    const m = (w - 2 * q) / n;
    ctx.fillStyle = "#1d1d1f";
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        if (code.isDark(r, c)) ctx.fillRect(q + c * m - 0.02, q + r * m - 0.02, m + 0.04, m + 0.04); // без щелей
  };
}

/** Штрих-код для красоты: полосы из номера удостоверения (детерминированно). */
function barcode(seed: string): Painter {
  return (ctx, w, h) => {
    let x = 0, v = [...seed].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
    const rnd = () => ((v = (v * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    const unit = w / 190;
    ctx.fillStyle = "#1d1d1f";
    while (x < w) {
      const bar = (1 + Math.floor(rnd() * 3)) * unit;
      ctx.fillRect(x, 0, Math.min(bar, w - x), h);
      x += bar + (1 + Math.floor(rnd() * 3)) * unit;
    }
  };
}

// ---------- машиночитаемая зона (MRZ, формат ID-карты: 3 × 30) ----------

const LAT: Record<string, string> = {
  а: "A", б: "B", в: "V", г: "G", д: "D", е: "E", ё: "E", ж: "ZH", з: "Z", и: "I", й: "Y", к: "K", л: "L", м: "M",
  н: "N", о: "O", п: "P", р: "R", с: "S", т: "T", у: "U", ф: "F", х: "KH", ц: "TS", ч: "CH", ш: "SH", щ: "SHCH",
  ъ: "", ы: "Y", ь: "", э: "E", ю: "YU", я: "YA", ә: "A", ғ: "G", қ: "Q", ң: "N", ө: "O", ұ: "U", ү: "U", һ: "H", і: "I",
};
const mrzName = (t: string) =>
  [...t.toLowerCase()].map(c => LAT[c] ?? (/[a-z0-9]/.test(c) ? c.toUpperCase() : "<")).join("");
const pad = (t: string) => (t + "<".repeat(30)).slice(0, 30);
/** Контрольная цифра ICAO 9303: веса 7-3-1. */
function check(t: string) {
  const val = (c: string) => (c === "<" ? 0 : /\d/.test(c) ? +c : c.charCodeAt(0) - 55);
  return String([...t].reduce((a, c, i) => a + val(c) * [7, 3, 1][i % 3], 0) % 10);
}

function mrz(p: Person) {
  const doc = p.number.replace(/\D/g, "").padStart(9, "0").slice(-9);
  const [dd, mm, yyyy] = p.issued.split(".");
  const date = yyyy.slice(2) + mm + dd;
  const brand = mrzName(site.brand);
  const sur = mrzName(p.surname);
  return [
    pad(`IDSMC${doc}${check(doc)}`),
    pad(`${date}${check(date)}<${brand}`),
    pad(sur ? `${sur}<<${mrzName(p.name)}` : `${mrzName(p.name)}<<${brand}`),
  ];
}

// ---------- стороны ----------

const field = (label: string, value: string) => {
  const f = el("div", s.field);
  f.append(el("span", s.lbl, label), el("span", s.val, value));
  return f;
};

export function pageUrl(p: Person) {
  return `${location.origin}/${p.slug}/`;
}

export function buildFace(p: Person, back: boolean, img: HTMLImageElement | null): HTMLElement {
  const face = el("div", `${s.face} ${back ? s.back : s.front}`);
  if (!back) {
    const top = el("div", s.top);
    const logo = el("span", s.logo, site.brand);
    logo.append(el("span", s.dot, "."));
    const kicker = el("div", s.kicker);
    idText.kicker.forEach(k => kicker.append(el("span", "", k)));
    top.append(logo, kicker);

    const body = el("div", s.body);
    const info = el("div", s.info);
    info.append(el("p", s.name, p.name));
    if (p.surname) info.append(el("p", s.name, p.surname));
    info.append(el("p", s.role, p.role));
    const fields = el("div", s.fields);
    fields.append(field(idText.fields.issued, p.issued), field(idText.fields.valid, idText.validValue));
    info.append(fields);
    body.append(painted(el("div", s.photo), portrait(p, img)), info);

    const foot = el("div", s.foot);
    foot.append(el("span", s.number, `№ ${p.number}`), painted(el("div", s.ghost), portrait(p, img)), el("span", s.mark));
    foot.lastElementChild!.setAttribute("data-paint", "");

    face.append(painted(el("div", s.guilloche), guilloche), top, body, foot);
  } else {
    const head = el("div", s.backTop);
    const info = el("div", s.backInfo);
    const list = el("div", s.contacts);
    const c = p.contacts, L = idText.contacts;
    const handle = (url: string) => "@" + url.replace(/\/+$/, "").split("/").pop();
    const rows: [string, string][] = [
      [L.phone, c.phone], [L.telegram, c.telegram && handle(c.telegram)],
      [L.instagram, c.instagram && handle(c.instagram)], [L.email, c.email],
    ];
    rows.filter(([, v]) => v).forEach(([l, v]) => {
      const row = el("div", s.field);
      row.append(el("span", s.lbl, l), el("span", s.cval, v));
      list.append(row);
    });
    info.append(list, el("p", s.qrNote, idText.qrNote));
    head.append(painted(el("div", s.qr), qr(pageUrl(p))), info);

    const zone = el("div", s.mrz);
    mrz(p).forEach(line => zone.append(el("span", "", line)));
    face.append(head, painted(el("div", s.barcode), barcode(p.number)), zone);
  }
  return face;
}

const photos = new Map<string, Promise<HTMLImageElement | null>>();
/** Фото грузится один раз; не загрузилось — монограмма. */
function loadPhoto(src: string) {
  if (!src) return Promise.resolve(null);
  if (!photos.has(src)) {
    const img = new Image();
    img.src = src;
    photos.set(src, img.decode().then(() => img, () => null));
  }
  return photos.get(src)!;
}

/** Растр обеих сторон под размер карты (для CardsRenderer и DOM-версии). */
export async function rasterIdCard(p: Person, size: { w: number; h: number }, dpr: number): Promise<FaceRaster> {
  const img = await loadPhoto(p.photo);
  const { w, h } = size;
  const faces = [false, true].map(back => {
    const box = el("div", s.box);
    box.style.cssText = `width:${w}px;height:${h}px`;
    const face = buildFace(p, back, img);
    box.append(face);
    return { box, face, w, h };
  });
  const c = p.contacts;
  const sample = [site.brand, ...idText.kicker, p.name, p.surname, p.role, p.number, p.issued,
    ...Object.values(idText.fields), idText.validValue, idText.qrNote, ...Object.values(idText.contacts),
    c.phone, c.email, c.telegram, c.instagram, "№<0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"].join("");
  const [front, back] = await rasterDom(faces, dpr, sample);
  return { front, back };
}
