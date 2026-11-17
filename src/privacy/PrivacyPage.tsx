import type { ReactNode } from "react";
import { Footer } from "../components/Footer/Footer";
import { Header } from "../components/Header/Header";
import { privacy } from "../content/privacy";
import { site, siteMenuAbroad } from "../content/site";
import ui from "../sections/ui.module.css";
import s from "./PrivacyPage.module.css";

const n2 = (k: number) => String(k + 1).padStart(2, "0");

/** Почта и телефон в тексте — ссылки (как в макете, раздел «Контакты»). */
const C = site.contacts;
const LINKS: [RegExp, string][] = [[/ychekster@gmail\.com/, C.emailHref], [/\+7[\s ]747[\s ]889-17-49/, C.phoneHref]];
function Linked({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let rest = text, k = 0;
  for (;;) {
    let best: { i: number; len: number; href: string } | null = null;
    for (const [rx, href] of LINKS) {
      const m = rx.exec(rest);
      if (m && (!best || m.index < best.i)) best = { i: m.index, len: m[0].length, href };
    }
    if (!best) break;
    out.push(rest.slice(0, best.i), <a key={k++} href={best.href}>{rest.slice(best.i, best.i + best.len)}</a>);
    rest = rest.slice(best.i + best.len);
  }
  out.push(rest);
  return <>{out}</>;
}

/**
 * Политика конфиденциальности (/privacy/) — обычная длинная страница (не секции):
 * шапка, заголовок, содержание слева (только компьютер) и 10 разделов; в конце —
 * футер на тёмном экране со своей шапкой. Прокручивается свой слой (.page,
 * position: absolute), а не body — см. «Системные полосы Safari» в global.css.
 */
export function PrivacyPage() {
  const cta = { label: site.cta, href: "/#contacts" };
  return (
    <div className={s.page}>
      <div className={s.top}>
        <Header cta={cta} menu={siteMenuAbroad} home="/" tone="light" />
      </div>
      <main className={s.main}>
        <div className={s.titleBlock}>
          <h1 className={s.title}>{privacy.title[0]}<br />{privacy.title[1]}</h1>
          <p className={s.lead}>{privacy.lead}</p>
        </div>
        <div className={s.cols}>
          <nav className={`${s.toc} ${ui.desktop}`} aria-label={privacy.contents}>
            <p className={s.tocTitle}>{privacy.contents}</p>
            {privacy.sections.map((sec, k) => (
              <a key={k} href={`#p${k + 1}`} className={s.tocItem}><span>{n2(k)}</span><span>{sec.title}</span></a>
            ))}
            <span className={ui.corner} aria-hidden="true" />
          </nav>
          <div className={s.sections}>
            {privacy.sections.map((sec, k) => (
              <section key={k} className={s.section}>
                <h2 id={`p${k + 1}`} className={s.h}><span>{n2(k)}</span>{"  "}{sec.title}</h2>
                {sec.blocks.map((b, j) => Array.isArray(b) ? (
                  <ul key={j} className={s.list}>
                    {b.map(it => <li key={it}><i aria-hidden="true" /><span>{it}</span></li>)}
                  </ul>
                ) : <p key={j} className={s.p}><Linked text={b} /></p>)}
              </section>
            ))}
          </div>
        </div>
      </main>
      <div className={`${s.footer} theme-dark`}>
        <Header cta={cta} menu={siteMenuAbroad} home="/" tone="dark" />
        <div className={s.footerInner}><Footer /></div>
      </div>
    </div>
  );
}
