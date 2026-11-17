import { footer, type FooterColumn } from "../../content/footer";
import s from "./Footer.module.css";

/** Ссылка футера; без адреса (PDF ещё нет) — просто текст. */
function Col({ col, area }: { col: FooterColumn; area: string }) {
  return (
    <div className={`${s.col} ${s[area]}`}>
      <p className={s.colTitle}>{col.title}</p>
      <div className={s.links}>
        {col.links.map(l => (
          <a key={l.label} className={`${s.link} ${l.desktop ? s.desktopOnly : ""}`} href={l.href || undefined}>
            {l.mobileLabel ? <><span className={s.dLabel}>{l.label}</span><span className={s.mLabel}>{l.mobileLabel}</span></> : l.label}
          </a>
        ))}
      </div>
    </div>
  );
}

/**
 * Футер — последний экран сайта, КП, вакансий и политики (макет «11. Футер»).
 * Над ним — шапка страницы (у каждой своя: меню сайта или КП, своя кнопка).
 * Ссылки на секции главной — "/#id": на самой главной их ловит Pager (hashchange).
 */
export function Footer() {
  return (
    <div className={s.footer}>
      <div className={s.top}>
        <div className={s.contact}>
          <h2 className={s.title}>{footer.title}</h2>
          <div className={s.contacts}>
            {footer.contacts.map(c => (
              <div key={c.label} className={`${s.item} ${c.desktop ? s.desktopOnly : ""}`}>
                <p className={s.label}>{c.label}</p>
                <a className={s.value} href={c.href}>{c.value}</a>
              </div>
            ))}
          </div>
        </div>

        <nav className={s.grid} aria-label={footer.sections.title}>
          {/* на телефоне — две колонки: [разделы, визитки] и [цены, вакансии]; на компьютере обёртки «растворяются» */}
          <div className={s.pair}>
            <Col col={footer.sections} area="aS" />
            <Col col={footer.cards} area="aC" />
          </div>
          <div className={s.pair}>
            <Col col={footer.prices} area="aP" />
            <Col col={footer.jobs} area="aJ" />
          </div>
        </nav>
      </div>

      <div className={s.bottom}>
        <p className={s.copy}>
          <span className={s.dLabel}>{footer.copyright}</span>
          <span className={s.mLabel}>{footer.copyrightMobile}</span>
        </p>
        <a className={s.privacy} href={footer.privacyHref}>{footer.privacy}</a>
      </div>
      <span className={s.corner} aria-hidden="true" />
    </div>
  );
}
