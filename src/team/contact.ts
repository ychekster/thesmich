import qrcode from "qrcode-generator";
import { site } from "../content/site";
import { cardText, type Person } from "../content/team";

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

/** Строки контактов оборота: подпись (для дикторов), значение, ссылка. Пустые — не показываем. */
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

/**
 * QR как SVG-путь (чёткий при любом размере, без canvas). Кириллица — байтами
 * UTF-8: библиотека пишет каждый символ строки одним байтом, поэтому отдаём ей
 * уже готовые байты.
 */
export function qrPath(text: string) {
  const utf8 = String.fromCharCode(...new TextEncoder().encode(text));
  const code = qrcode(0, "L");
  code.addData(utf8, "Byte");
  code.make();
  const n = code.getModuleCount();
  let d = "";
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (code.isDark(y, x)) d += `M${x} ${y}h1v1h-1z`;
  return { n, d };
}
