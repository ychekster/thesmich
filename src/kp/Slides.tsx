import type { ReactNode } from "react";
import type { KpText } from "../content/kp";
import { r } from "../pager/reveal";
import ui from "../sections/ui.module.css";
import s from "./Slides.module.css";

/**
 * Слайды коммерческого предложения (макет Claude Design «КП», 12 слайдов ×
 * компьютер/телефон). Размеры на компьютере — calc(N * var(--u)), на телефоне —
 * px из мобильного макета (Slides.module.css). Тексты — content/kp.ts.
 * Слайд «Каналы продвижения» — общий с главной (sections/Channels).
 */

/** "\n" в тексте — перенос только на компьютере (на телефоне — пробел). */
function Text({ children }: { children: string }) {
  const parts = children.split("\n");
  return <>{parts.map((p, k) => <span key={k}>{k > 0 && <>{" "}<br className={ui.desktop} /></>}{p}</span>)}</>;
}

/** Заголовок из строк; если на телефоне разбивка другая — два варианта. */
function Title({ lines, mobile, className = ui.h2 }: { lines: string[]; mobile?: string[]; className?: string }) {
  const join = (ls: string[]) => ls.map((l, k) => <span key={k}>{k > 0 && <br />}{l}</span>);
  return (
    <h2 className={className} {...r(0)}>
      {mobile ? (
        <>
          <span className={ui.desktop}>{join(lines)}</span>
          <span className={ui.mobile}>{join(mobile)}</span>
        </>
      ) : join(lines)}
    </h2>
  );
}

/** Текст, у которого на телефоне своя версия (m = "" — на телефоне текста нет). */
function Both({ d, m }: { d: string; m?: string }) {
  if (m === undefined) return <Text>{d}</Text>;
  if (m === "") return <span className={ui.desktop}><Text>{d}</Text></span>;
  return (
    <>
      <span className={ui.desktop}><Text>{d}</Text></span>
      <span className={ui.mobile}>{m}</span>
    </>
  );
}

/** Заголовок слева, фраза справа (компьютер); на телефоне — фраза под заголовком. */
function Head({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className={s.head}>
      {title}
      {children && <p className={s.headText} {...r(1)}>{children}</p>}
    </div>
  );
}

const Corner = ({ small }: { small?: boolean }) => (
  <span className={`${ui.corner} ${small ? s.c18 : ""}`} aria-hidden="true" />
);
const n2 = (k: number) => String(k + 1).padStart(2, "0");

/* ---------- 1. Титул ---------- */
export function KpTitle({ t }: { t: KpText["title"] }) {
  return (
    <div className={s.cover}>
      <p className={s.eyebrow} {...r(0)}>{t.eyebrow}</p>
      <Title lines={t.title} className={`${ui.h1} ${s.coverH}`} />
      <p className={s.coverText} {...r(2)}>{t.text}</p>
      <span className={s.bigCorner} aria-hidden="true" />
    </div>
  );
}

/* ---------- 2. Что мы делаем ---------- */
export function KpServices({ t }: { t: KpText["services"] }) {
  return (
    <div className={s.col}>
      <Title lines={t.title} />
      <ul className={s.services}>
        {t.items.map((it, k) => (
          <li key={it.title} className={`${s.card} ${s.white} ${s.service}`} {...r(1 + k)}>
            <span className={s.num}>{n2(k)}</span>
            <h3 className={s.cardH}>{it.title}</h3>
            <p className={s.cardT}><Both d={it.text} m={it.textMobile} /></p>
            <p className={s.separately}>{t.separately}</p>
            <Corner />
          </li>
        ))}
      </ul>
      <p className={s.servicesNote} {...r(3)}><Both d={t.note} m={t.noteMobile} /></p>
    </div>
  );
}

/* ---------- 3. Что входит в каждый сайт ---------- */
export function KpIncluded({ t }: { t: KpText["included"] }) {
  return (
    <div className={`${s.col} ${s.included}`}>
      <Head title={<Title lines={t.title} />}><Both d={t.lead} m={t.leadMobile} /></Head>
      <ul className={s.incList}>
        {t.items.map((it, k) => (
          <li key={it.title} className={`${s.card} ${s.white} ${s.inc}`} {...r(2 + k)}>
            <i className={s.mark} aria-hidden="true" />
            <div className={s.incBody}>
              <h3 className={s.incH}>{it.title}</h3>
              <p className={`${s.incT} ${ui.desktop}`}><Text>{it.text}</Text></p>
              <p className={`${s.incT} ${ui.mobile}`}>{it.short}</p>
            </div>
            <span className={`${ui.corner} ${ui.desktop}`} aria-hidden="true" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- 4. Стоимость сайта ---------- */
export function KpPrices({ t }: { t: KpText["prices"] }) {
  return (
    <div className={`${s.col} ${s.pricesSlide}`}>
      <Head title={<Title lines={t.title} mobile={t.titleMobile} />}><Both d={t.lead} m={t.leadMobile} /></Head>
      <ul className={s.prices}>
        {t.items.map((it, k) => (
          <li key={it.title} className={`${s.card} ${s.grey} ${s.price}`} {...r(2 + k)}>
            <h3 className={s.priceH}><Both d={it.title} m={it.titleMobile} /></h3>
            <p className={s.priceV}>{it.price}</p>
            <p className={s.priceT}>{it.text}</p>
            <p className={s.priceTerm}>{it.term}</p>
            <Corner small />
          </li>
        ))}
        <li className={`${s.card} ${s.dark} ${s.price} ${s.deal}`} {...r(7)}>
          <h3 className={s.priceH}><Both d={t.deal.title} m={t.deal.titleMobile} /></h3>
          <p className={s.dealV}>{t.deal.value}</p>
          <p className={s.priceT}>{t.deal.text}</p>
          <Corner small />
        </li>
      </ul>
    </div>
  );
}

/* строки «название — цена» с линией снизу (слайды 5 и 7) */
function Rows({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <ul className={s.rows}>
      {rows.map(row => (
        <li key={row.label} className={s.row}>
          <span className={s.rowL}>{row.label}</span>
          <span className={s.rowV}>{row.value}</span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- 5. Из чего складывается цена ---------- */
export function KpBreakdown({ t }: { t: KpText["breakdown"] }) {
  return (
    <div className={s.col}>
      <Title lines={t.title} mobile={t.titleMobile} />
      <p className={s.bdLead} {...r(1)}><Both d={t.lead} m={t.leadMobile} /></p>
      <div className={s.bdGrid}>
        {[t.save, t.add].map((b, k) => (
          <div key={b.title} className={`${s.card} ${s.white} ${s.box}`} {...r(2 + k)}>
            <p className={s.boxH}>{b.title}</p>
            <Rows rows={b.rows} />
            <span className={`${ui.corner} ${ui.desktop}`} aria-hidden="true" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- 7. Стоимость продвижения ---------- */
export function KpPromotion({ t }: { t: KpText["promotion"] }) {
  return (
    <div className={s.col}>
      <Title lines={t.title} mobile={t.titleMobile} />
      <div className={s.promoGrid}>
        <div className={`${s.card} ${s.white} ${s.percent}`} {...r(1)}>
          <div className={s.percentTop}>
            <span className={s.percentV}>{t.percent.value}</span>
            <p className={s.percentT}>{t.percent.text}</p>
          </div>
          <ul className={s.terms}>
            {t.rows.map(row => (
              <li key={row.label} className={`${s.term} ${row.desktop ? s.dOnly : ""}`}>
                <span className={s.termL}>{row.label}</span>
                <span className={s.termV}>{row.value}</span>
              </li>
            ))}
          </ul>
          <p className={`${s.example} ${ui.desktop}`}>{t.example}</p>
          <Corner />
        </div>
        <div className={s.promoRight}>
          <div className={`${s.card} ${s.white} ${s.box} ${s.fixed}`} {...r(2)}>
            <p className={s.boxH}>{t.fixed.title}</p>
            <p className={`${s.boxNote} ${ui.desktop}`}>{t.fixed.note}</p>
            <Rows rows={t.fixed.rows} />
          </div>
          <div className={`${s.card} ${s.white} ${s.box} ${s.report} ${s.dOnly}`} {...r(3)}>
            <p className={s.boxH}>{t.report.title}</p>
            <p className={s.reportT}>{t.report.text}</p>
            <Corner />
          </div>
        </div>
      </div>
      <p className={`${s.reportMobile} ${ui.mobile}`}>{t.report.textMobile}</p>
    </div>
  );
}

/* ---------- 8. Этапы и сроки ---------- */
export function KpSteps({ t }: { t: KpText["steps"] }) {
  return (
    <div className={`${s.col} ${s.stepsSlide}`}>
      <Head title={<Title lines={t.title} />}><Both d={t.lead} m={t.leadMobile} /></Head>
      <ol className={s.steps}>
        {t.items.map((it, k) => (
          <li key={it.title} className={`${s.card} ${s.dark} ${s.step}`} {...r(2 + k)}>
            <span className={`${s.stepN} ${ui.desktop}`}>{n2(k)}</span>
            <div className={s.stepBody}>
              <h3 className={s.stepH}><span className={`${s.stepNi} ${ui.mobile}`}>{n2(k)}{"  "}</span>{it.title}</h3>
              <p className={s.stepT}>{it.text}</p>
            </div>
            <span className={s.stepTime}>{it.time}</span>
            <Corner small />
          </li>
        ))}
      </ol>
      <p className={s.stepsNote} {...r(7)}>{t.note}</p>
    </div>
  );
}

/* список с красными квадратами (слайды 9 и 10) */
function Bullets({ items, className = "" }: { items: string[]; className?: string }) {
  return (
    <ul className={`${s.bullets} ${className}`}>
      {items.map(it => (
        <li key={it} className={s.bullet}><i className={s.bulletMark} aria-hidden="true" /><span>{it}</span></li>
      ))}
    </ul>
  );
}

/* ---------- 9. Правки и что нужно от вас ---------- */
export function KpRevisions({ t }: { t: KpText["revisions"] }) {
  return (
    <div className={s.col}>
      <Title lines={t.title} mobile={t.titleMobile} />
      <div className={s.two}>
        {t.lists.map((l, k) => (
          <div key={l.title} className={`${s.card} ${s.grey} ${s.listCard}`} {...r(1 + k)}>
            <p className={s.boxH}>{l.title}</p>
            <Bullets items={l.items} />
            <Corner />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- 10. Оплата ---------- */
export function KpPayment({ t }: { t: KpText["payment"] }) {
  return (
    <div className={s.col}>
      <Title lines={t.title} />
      <ul className={s.parts}>
        {t.parts.map((p, k) => (
          <li key={k} className={`${s.card} ${s.white} ${s.part}`} {...r(1 + k)}>
            <span className={s.partV}>{p.value}</span>
            <p className={s.partT}><Both d={p.text} m={p.textMobile} /></p>
            <Corner small />
          </li>
        ))}
      </ul>
      <div className={s.payNotes} {...r(4)}><Bullets items={t.notes} /></div>
    </div>
  );
}

/* ---------- 11. Гарантии ---------- */
export function KpGuarantees({ t }: { t: KpText["guarantees"] }) {
  return (
    <div className={`${s.col} ${s.guarSlide}`}>
      <Head title={<Title lines={t.title} />}>{t.lead}</Head>
      <ul className={s.two}>
        {t.items.map((it, k) => (
          <li key={it.title} className={`${s.card} ${s.dark} ${s.guar}`} {...r(2 + k)}>
            <h3 className={s.guarH}>{it.title}</h3>
            <p className={s.guarT}><Both d={it.text} m={it.textMobile} /></p>
            <Corner small />
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- 12. Как начать ---------- */
export function KpStart({ t }: { t: KpText["start"] }) {
  return (
    <div className={`${s.col} ${s.startSlide}`}>
      <Title lines={t.title} className={`${ui.h1} ${s.startH}`} />
      <ol className={s.startSteps}>
        {t.steps.map((st, k) => (
          <li key={st.title} className={`${s.card} ${s.grey} ${s.startStep}`} {...r(1 + k)}>
            <span className={s.num}>{n2(k)}</span>
            <h3 className={s.cardH}>{st.title}</h3>
            <p className={s.startT}><Both d={st.text} m={st.textMobile} /></p>
            <Corner small />
          </li>
        ))}
      </ol>
      <div className={s.reach} {...r(4)}>
        <a className={`${ui.btn} ${s.reachBtn}`} href={t.button.href} target="_blank" rel="noreferrer">{t.button.label}</a>
        <ul className={s.reachList}>
          {t.contacts.map(c => (
            <li key={c.label} className={s.reachItem}>
              <span className={s.reachL}>{c.label}<span className={ui.mobile}>:</span></span>{" "}
              <a className={s.reachV} href={c.href} {...(c.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>{c.value}</a>
            </li>
          ))}
        </ul>
      </div>
      <p className={s.copy}>{t.copyright}</p>
    </div>
  );
}
