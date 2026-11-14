import { useMemo } from "react";
import { site } from "../../content/site";
import { idText, type Person } from "../../content/team";
import { IdCard } from "../IdCard/IdCard";
import { pageUrl } from "../IdCard/faces";
import s from "./PersonPage.module.css";

/** vCard для «В контакты»: телефон сам предложит сохранить контакт. */
function vcard(p: Person) {
  const c = p.contacts;
  const lines = [
    "BEGIN:VCARD", "VERSION:3.0",
    `N:${p.surname};${p.name};;;`, `FN:${[p.name, p.surname].filter(Boolean).join(" ")}`,
    `ORG:${site.brand}`, `TITLE:${p.role}`,
    c.phoneHref && `TEL;TYPE=CELL:${c.phoneHref.replace(/^tel:/, "")}`,
    c.email && `EMAIL:${c.email}`,
    c.telegram && `URL;TYPE=Telegram:${c.telegram}`,
    c.instagram && `URL;TYPE=Instagram:${c.instagram}`,
    `URL:${pageUrl(p)}`,
    "END:VCARD",
  ];
  return lines.filter(Boolean).join("\r\n");
}

/**
 * Страница-визитка одного человека: только удостоверение во весь экран
 * и строка кликабельных контактов под ним. Без шапки и футера.
 */
export function PersonPage({ person }: { person: Person }) {
  const c = person.contacts, A = idText.actions;
  const backText = useMemo(
    () => [[idText.contacts.phone, c.phone], [idText.contacts.telegram, c.telegram], [idText.contacts.instagram, c.instagram], [idText.contacts.email, c.email]]
      .filter(([, v]) => v).map(([l, v]) => `${l}: ${v}`).join(". "),
    [c],
  );
  const save = () => {
    const url = URL.createObjectURL(new Blob([vcard(person)], { type: "text/vcard;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${person.slug}.vcf` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <main className={s.page}>
      <h1 className={s.srOnly}>{idText.label(person)}</h1>
      <IdCard person={person} slotClassName={s.slot} backText={backText} />
      <nav className={s.actions}>
        {c.phoneHref && <a className={s.action} href={c.phoneHref}>{A.call}</a>}
        {c.telegram && <a className={s.action} href={c.telegram} target="_blank" rel="noreferrer">{A.telegram}</a>}
        {c.instagram && <a className={s.action} href={c.instagram} target="_blank" rel="noreferrer">{A.instagram}</a>}
        <button className={`${s.action} ${s.primary}`} type="button" onClick={save}>{A.save}</button>
        <a className={`${s.action} ${s.home}`} href="/">{A.site}</a>
      </nav>
    </main>
  );
}
