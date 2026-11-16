import { useEffect, useState } from "react";
import { site } from "../../content/site";
import { nav } from "../../pager/nav";
import s from "./Header.module.css";

export interface HeaderLink {
  label: string;
  /** id секции, к которой ведёт пункт. */
  to: string;
}

interface HeaderProps {
  /** Кнопка-«таблетка» справа (на телефоне — последней строкой меню). */
  cta: HeaderLink;
  /** Пункты меню телефона. */
  menu: readonly HeaderLink[];
}

/**
 * Шапка висит поверх всех секций, своего фона нет. Цвет — по секции под ней
 * (html[data-tone], ставит движок на середине перехода). Логотип — строчными
 * с красной точкой, ведёт к первой секции; кнопка — к своей секции (cta.to).
 * На телефоне вместо кнопки — бургер: открывает красное меню на весь экран
 * (макет «Меню (открыто)»), текущий раздел подчёркнут.
 */
export function Header({ cta, menu }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");

  const go = (to: string) => { setOpen(false); nav.go(to); };
  const show = () => {
    // подчёркнут последний пункт меню, чья секция не ниже текущей
    const cur = nav.ids.indexOf(nav.current);
    let a = "";
    for (const m of menu) if (nav.ids.indexOf(m.to) <= cur) a = m.to;
    setActive(a);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header className={s.header}>
        <a className={s.logo} href={`#${nav.ids[0] ?? ""}`} onClick={e => { e.preventDefault(); go(nav.ids[0]); }}>
          {site.brand}<span className={s.dot}>.</span>
        </a>
        <button className={s.cta} type="button" onClick={() => go(cta.to)}>{cta.label}</button>
        <button className={s.burger} type="button" aria-label={site.menuOpen} aria-expanded={open} onClick={show}>
          <i /><i /><i />
        </button>
      </header>

      {open && (
        <div className={s.menu} role="dialog" aria-modal="true" aria-label={site.menuLabel}>
          <button className={s.close} type="button" aria-label={site.menuClose} onClick={() => setOpen(false)} autoFocus>
            <i /><i />
          </button>
          <nav className={s.list} aria-label={site.menuLabel}>
            {menu.map(m => (
              <a
                key={m.to} href={`#${m.to}`} className={s.item} aria-current={m.to === active ? "true" : undefined}
                onClick={e => { e.preventDefault(); go(m.to); }}
              >{m.label}</a>
            ))}
            <button className={s.menuCta} type="button" onClick={() => go(cta.to)}>{cta.label}</button>
          </nav>
        </div>
      )}
    </>
  );
}
