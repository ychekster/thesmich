import qrcode from "qrcode-generator";
import { site } from "../../content/site";
import { cardText, studio, type Person } from "../../content/team";
import { painted, rasterDom, type FaceRaster, type Painter } from "../../gl/raster";
import s from "./TeamCard.module.css";

/*
 * Стороны визитки (ID-1 85.6 × 54; на телефоне вертикальная). Обе стороны
 * светлые. Раскладку делает CSS (TeamCard.module.css, размеры в cqw), графику —
 * «художники» (painted из gl/raster.ts): портрет-монограмма и QR.
 *
 * Лицо — доверие: фото, полное имя, роль в студии, чем занимаемся, где работаем.
 * Оборот — связь: контакты и две кнопки. Строки и кнопки — настоящие ссылки:
 * та же разметка лежит невидимым слоем поверх карты (TeamCard.tsx, LinkLayer).
 * QR — vCard: камера телефона сразу предлагает сохранить контакт.
 */

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string) {
  const e = document.createElement(tag);
  e.className = cls;
  if (text) e.textContent = text;
  return e;
}

// ---------- контакт ----------

export function pageUrl(p: Person) {
  return `${location.origin}/${p.slug}/`;
}

/**
 * vCard 3.0. Кириллица — с CHARSET=UTF-8 у полей: без него камера iPhone
 * местами показывает вопросики вместо букв.
 */
export function vcard(p: Person) {
  const c = p.contacts, U = ";CHARSET=UTF-8";
  return [
    "BEGIN:VCARD", "VERSION:3.0",
    `N${U}:${p.surname};${p.name};;;`, `FN${U}:${p.name} ${p.surname}`,
    `ORG${U}:${site.brand}`, `TITLE${U}:${p.role}`,
    c.phoneHref && `TEL;TYPE=CELL:${c.phoneHref.replace(/^tel:/, "")}`,
    c.email && `EMAIL:${c.email}`,
    c.telegram && `URL:${c.telegram}`,
    `URL:${pageUrl(p)}`,
    "END:VCARD",
  ].filter(Boolean).join("\r\n");
}

/** Строки контактов оборота: подпись, значение, ссылка. Пустые — не показываем. */
export function contactRows(p: Person) {
  const c = p.contacts, L = cardText.contacts;
  const handle = (url: string) => "@" + url.replace(/\/+$/, "").split("/").pop();
  return ([
    [L.whatsapp, c.whatsapp && c.phone, c.whatsapp],
    [L.telegram, c.telegram && handle(c.telegram), c.telegram],
    [L.phone, c.phone, c.phoneHref],
    [L.instagram, c.instagram && handle(c.instagram), c.instagram],
    [L.email, c.email, c.email && `mailto:${c.email}`],
  ] as const).filter(([, v, href]) => v && href).map(([label, value, href]) => ({ label, value, href }));
}

// ---------- графика ----------

/** Портрет: фото (обрезка по центру) или монограмма, как в «Контактах» Apple. */
function portrait(p: Person, img: HTMLImageElement | null): Painter {
  return (ctx, w, h) => {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, Math.min(w, h) * 0.08);
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
      ctx.font = `600 ${Math.min(w, h) * 0.36}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.name.slice(0, 1) + p.surname.slice(0, 1), w / 2, h * 0.53);
    }
    ctx.restore();
  };
}

/**
 * QR (vCard) на белой плашке. Кириллица — байтами UTF-8: библиотека пишет
 * каждый символ строки одним байтом, поэтому отдаём ей уже готовые байты.
 */
function qr(text: string): Painter {
  const utf8 = String.fromCharCode(...new TextEncoder().encode(text));
  const code = qrcode(0, "L");
  code.addData(utf8, "Byte");
  code.make();
  const n = code.getModuleCount();
  return (ctx, w) => {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.roundRect(0, 0, w, w, w * 0.06);
    ctx.fill();
    const q = w * 0.06;              // тихая зона
    const m = (w - 2 * q) / n;
    ctx.fillStyle = "#1d1d1f";
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        if (code.isDark(r, c)) ctx.fillRect(q + c * m - 0.02, q + r * m - 0.02, m + 0.04, m + 0.04); // без щелей
  };
}

// ---------- стороны ----------

function logo() {
  const l = el("span", s.logo, site.brand);
  l.append(el("span", s.dot, "."));
  return l;
}

export function buildFace(p: Person, back: boolean, img: HTMLImageElement | null = null): HTMLElement {
  const face = el("div", `${s.face} ${back ? s.back : s.front}`);
  if (!back) {
    const info = el("div", s.info);
    const top = el("div", s.top);
    top.append(logo());
    if (studio.bin) top.append(el("span", s.bin, `${cardText.bin} ${studio.bin}`));
    const who = el("div", s.who);
    who.append(el("p", s.name, p.name), el("p", s.name, p.surname), el("p", s.role, cardText.roleAt(p)));
    const about = el("div", s.about);
    about.append(el("p", s.tagline, studio.tagline), el("p", s.area, studio.area));
    info.append(top, who, about);
    face.append(painted(el("div", s.photo), portrait(p, img)), info);
  } else {
    const main = el("div", s.main);
    main.append(el("p", s.title, cardText.title));
    const list = el("div", s.list);
    for (const r of contactRows(p)) {
      const a = el("a", s.row);
      a.href = r.href;
      if (/^https?:/.test(r.href)) { a.target = "_blank"; a.rel = "noreferrer"; }
      a.append(el("span", s.rowLbl, r.label), el("span", s.rowVal, r.value));
      const sep = el("i", s.sep);
      sep.dataset.paint = ""; // линия-разделитель: растр рисует плашки, а не рамки
      list.append(sep, a);
    }
    const btns = el("div", s.btns);
    const save = el("a", `${s.btn} ${s.btnSave}`, cardText.save);
    save.dataset.paint = ""; save.dataset.save = ""; // ссылку на vCard ставит LinkLayer
    const quiz = el("a", `${s.btn} ${s.btnQuiz}`, cardText.quiz);
    quiz.dataset.paint = ""; quiz.href = "/#quiz";
    btns.append(save, quiz);
    main.append(list, btns);

    const side = el("div", s.side);
    side.append(painted(el("div", s.qr), qr(vcard(p))), el("p", s.qrNote, cardText.qrNote));
    face.append(main, side);
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
export async function rasterTeamCard(p: Person, size: { w: number; h: number }, dpr: number): Promise<FaceRaster> {
  const img = await loadPhoto(p.photo);
  const { w, h } = size;
  const faces = [false, true].map(back => {
    const box = el("div", s.box);
    box.style.cssText = `width:${w}px;height:${h}px`;
    const face = buildFace(p, back, img);
    box.append(face);
    return { box, face, w, h };
  });
  const sample = [site.brand, p.name, p.surname, cardText.roleAt(p), studio.tagline, studio.area, studio.bin,
    cardText.title, cardText.save, cardText.quiz, cardText.qrNote, ...contactRows(p).flatMap(r => [r.label, r.value])].join("");
  const [front, back] = await rasterDom(faces, dpr, sample);
  return { front, back };
}
