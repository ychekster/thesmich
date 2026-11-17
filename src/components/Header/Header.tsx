import { useEffect, useState, useSyncExternalStore, type MouseEvent } from "react";
import { site } from "../../content/site";
import { nav } from "../../pager/nav";
import s from "./Header.module.css";

export interface HeaderLink {
  label: string;
  /** id секции на этой странице, к которой ведёт пункт… */
  to?: string;
  /** …или адрес другой страницы ("/#about", "/vacancy-manager/#apply"). */
  href?: string;
}

interface HeaderProps {
  /** Кнопка-«таблетка» справа (на телефоне — последней строкой меню). */
  cta: HeaderLink;
  /** Меню: на компьютере — в шапке, на телефоне — за бургером. */
  menu: readonly HeaderLink[];
  /** Куда ведёт логотип: по умолчанию — к первой секции этой страницы. */
  home?: string;
  /** Постоянный цвет (страница без секций — политика); иначе — по секции под шапкой. */
  tone?: "dark" | "light";
}

const hrefOf = (l: HeaderLink) => l.href ?? `#${l.to ?? ""}`;

/**
 * Шапка висит поверх всех секций, своего фона нет. Цвет — по секции под ней
 * (html[data-tone], ставит движок на середине перехода). Логотип — строчными
 * с красной точкой. На компьютере — меню разделов (подчёркнут пункт текущей
 * секции) и кнопка; на телефоне вместо них бургер: красное меню на весь экран
 * (макет «Меню (открыто)»), подчёркнут текущий раздел.
 */
export function Header({ cta, menu, home, tone }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");
  const current = useSyncExternalStore(nav.subscribe, () => nav.current);

  const follow = (l: HeaderLink) => (e: MouseEvent) => {
    setOpen(false);
    if (l.to && !l.href) { e.preventDefault(); nav.go(l.to); }
  };
  const show = () => {
    // меню телефона: подчёркнут последний пункт, чья секция не ниже текущей
    const cur = nav.ids.indexOf(nav.current);
    let a = "";
    for (const m of menu) if (m.to && !m.href && nav.ids.indexOf(m.to) <= cur) a = m.to;
    setActive(a);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open]);

  const logo: HeaderLink = home ? { label: "", href: home } : { label: "", to: nav.ids[0] ?? "top" };

  return (
    <>
      <header className={s.header} data-tone={tone}>
        <a className={s.logo} href={hrefOf(logo)} onClick={follow(logo)}>
          {site.brand}<span className={s.dot}>.</span>
        </a>
        <nav className={s.nav} aria-label={site.menuLabel}>
          {menu.map(m => (
            <a
              key={m.label} href={hrefOf(m)} className={s.navItem} onClick={follow(m)}
              aria-current={m.to && !m.href && m.to === current ? "true" : undefined}
            >{m.label}</a>
          ))}
        </nav>
        <a className={s.cta} href={hrefOf(cta)} onClick={follow(cta)}>{cta.label}</a>
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
                key={m.label} href={hrefOf(m)} className={s.item} onClick={follow(m)}
                aria-current={m.to && !m.href && m.to === active ? "true" : undefined}
              >{m.label}</a>
            ))}
            <a className={s.menuCta} href={hrefOf(cta)} onClick={follow(cta)}>{cta.label}</a>
          </nav>
        </div>
      )}
    </>
  );
}
