import { site } from "../../content/site";
import { nav } from "../../pager/nav";
import s from "./Header.module.css";

/**
 * Шапка висит поверх всех секций, своего фона нет. Цвет — по секции под ней
 * (html[data-tone], ставит движок на середине перехода). Логотип — к первой
 * секции, кнопка — к контактам.
 */
export function Header() {
  return (
    <header className={s.header}>
      <a className={s.logo} href="#top" onClick={e => { e.preventDefault(); nav.go("top"); }}>
        {site.brand}
      </a>
      <button className={s.cta} type="button" onClick={() => nav.go("contacts")}>{site.cta}</button>
    </header>
  );
}
