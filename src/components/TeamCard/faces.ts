import qrcode from "qrcode-generator";
import { site } from "../../content/site";
import { cardText, type Person } from "../../content/team";
import { painted, rasterDom, type FaceRaster, type Painter } from "../../gl/raster";
import s from "./TeamCard.module.css";

/*
 * Стороны визитки — по образцу владельца: вертикальная карта (54 × 85.6) и на
 * компьютере, и на телефоне. Раскладку делает CSS (TeamCard.module.css, размеры
 * в cqw), графику — «художники» (painted из gl/raster.ts): фото и QR.
 *
 * Лицо — фото во весь размер, поверх крупное имя заглавными. Нет фото — под
 * именем тёмный материал карты (шейдер), без заглушек.
 * Оборот — светлый: роль сверху, QR по центру, внизу имя и контакты. Контакты и
 * QR — настоящие ссылки: та же разметка лежит невидимым слоем поверх карты
 * (TeamCard.tsx, LinkLayer). QR — vCard: камера телефона предлагает сохранить
 * контакт, нажатие по QR скачивает его файлом.
 */
import "@fontsource/inter/800.css";

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

/** Строки контактов оборота: подпись (только для дикторов), значение, ссылка. Пустые — не показываем. */
export function contactRows(p: Person) {
  const c = p.contacts, L = cardText.contacts;
  const handle = (url: string) => "@" + url.replace(/\/+$/, "").split("/").pop();
  return ([
    [L.telegram, c.telegram && handle(c.telegram), c.telegram],
    [L.phone, c.phone, c.phoneHref],
    [L.instagram, c.instagram && handle(c.instagram), c.instagram],
    [L.email, c.email, c.email && `mailto:${c.email}`],
  ] as const).filter(([, v, href]) => v && href).map(([label, value, href]) => ({ label, value, href }));
}

// ---------- графика ----------

/** Фото во весь размер карты (обрезка по центру) и лёгкое затемнение под белое имя. */
function portrait(img: HTMLImageElement): Painter {
  return (ctx, w, h) => {
    const k = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const iw = img.naturalWidth * k, ih = img.naturalHeight * k;
    ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.45, "rgba(0,0,0,.18)");
    g.addColorStop(1, "rgba(0,0,0,.35)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  };
}

/**
 * QR (vCard) прямо на светлом обороте, без плашки. Кириллица — байтами UTF-8:
 * библиотека пишет каждый символ строки одним байтом, поэтому отдаём ей уже
 * готовые байты.
 */
function qr(text: string): Painter {
  const utf8 = String.fromCharCode(...new TextEncoder().encode(text));
  const code = qrcode(0, "L");
  code.addData(utf8, "Byte");
  code.make();
  const n = code.getModuleCount();
  return (ctx, w) => {
    const m = w / n;
    ctx.fillStyle = "#1d1d1f";
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        if (code.isDark(r, c)) ctx.fillRect(c * m - 0.02, r * m - 0.02, m + 0.04, m + 0.04); // без щелей
  };
}

// ---------- стороны ----------

export function buildFace(p: Person, back: boolean, img: HTMLImageElement | null = null): HTMLElement {
  const face = el("div", `${s.face} ${back ? s.back : s.front}`);
  if (!back) {
    if (img) face.append(painted(el("div", s.photo), portrait(img)));
    const name = el("div", s.name);
    name.append(el("p", "", p.name), el("p", "", p.surname));
    face.append(name);
  } else {
    const role = el("div", s.role);
    for (const line of cardText.roleLines(p)) role.append(el("p", "", line));

    const code = painted(el("a", s.qr), qr(vcard(p)));
    code.dataset.save = ""; // ссылку на vCard ставит LinkLayer
    code.setAttribute("aria-label", cardText.save);

    const foot = el("div", s.foot);
    foot.append(el("p", s.fullName, `${p.name} ${p.surname}`));
    const list = el("div", s.list);
    for (const r of contactRows(p)) {
      const a = el("a", s.row, r.value);
      a.href = r.href;
      if (/^https?:/.test(r.href)) { a.target = "_blank"; a.rel = "noreferrer"; }
      list.append(a);
    }
    foot.append(list);
    face.append(role, code, foot);
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
  const sample = [p.name, p.surname, p.name.toUpperCase(), p.surname.toUpperCase(), ...cardText.roleLines(p),
    ...contactRows(p).map(r => r.value)].join("");
  const [front, back] = await rasterDom(faces, dpr, sample);
  return { front, back };
}
