import { useState, type FormEvent } from "react";
import { applyContacts, type VacancySlide } from "../content/vacancies";
import { sendLead } from "../lib/lead";
import { r } from "../pager/reveal";
import ui from "../sections/ui.module.css";
import s from "./Slides.module.css";

/**
 * Слайды вакансий (макет Claude Design 2026-11-17, «Вакансия: менеджер» и
 * «Вакансия: автор видео»). На компьютере — числа макета 1920×1080 без увеличения
 * контента (--u = --u0, контейнер 1360), на телефоне — px мобильного макета.
 * Тексты — content/vacancies.ts.
 */

/** "\n" — перенос только на компьютере. */
function Text({ children }: { children: string }) {
  return <>{children.split("\n").map((p, k) => <span key={k}>{k > 0 && <>{" "}<br className={ui.desktop} /></>}{p}</span>)}</>;
}
/** Текст с мобильной версией; m = "" — на телефоне текста нет. */
function Both({ d, m }: { d: string; m?: string }) {
  if (m === undefined) return <Text>{d}</Text>;
  return (
    <>
      <span className={ui.desktop}><Text>{d}</Text></span>
      {m && <span className={ui.mobile}>{m}</span>}
    </>
  );
}
const lines = (ls: string[]) => ls.map((l, k) => <span key={k}>{k > 0 && <br />}{l}</span>);
const n2 = (k: number) => String(k + 1).padStart(2, "0");
const Corner = () => <span className={ui.corner} aria-hidden="true" />;

/** Заголовок слева, фраза справа (компьютер); на телефоне — фраза под заголовком. */
function Head({ title, lead, leadMobile, width = 620 }: { title: string[]; lead: string; leadMobile?: string; width?: number }) {
  return (
    <div className={s.head} style={{ ["--lw" as string]: width }}>
      <h2 className={s.h} {...r(0)}>{lines(title)}</h2>
      <p className={`${s.lead} ${leadMobile === "" ? ui.desktop : ""}`} {...r(1)}><Both d={lead} m={leadMobile} /></p>
    </div>
  );
}

export function VacancySlideView({ slide }: { slide: VacancySlide }) {
  switch (slide.kind) {
    case "title": return (
      <div className={`${s.slide} ${s.title}`} style={{ ["--t" as string]: slide.size, ["--tm" as string]: `${slide.sizeMobile}px` }}>
        <p className={s.eyebrow} {...r(0)}>{slide.eyebrow}</p>
        <h1 className={s.big} {...r(1)}>
          <span className={ui.desktop}>{lines(slide.title)}</span>
          <span className={ui.mobile}>{lines(slide.titleMobile)}</span>
        </h1>
        <p className={s.titleText} {...r(2)}>{slide.text}</p>
        <span className={s.screenCorner} aria-hidden="true" />
      </div>
    );

    case "cards": return (
      <div className={s.slide}>
        <Head title={slide.title} lead={slide.lead} leadMobile={slide.leadMobile} width={slide.leadWidth} />
        <ul
          className={`${s.cards} ${slide.numbered ? s.numbered : ""}`} data-cols={slide.cols}
          style={{ ["--cols" as string]: slide.cols, ["--mcols" as string]: slide.mobileCols }}
        >
          {slide.items.map((it, k) => (
            <li key={it.title} className={s.card} {...r(2 + k)}>
              <div className={s.cardHead}>
                {slide.numbered && <span className={s.n}>{n2(k)}</span>}
                <h3 className={s.cardH}>{it.title}</h3>
              </div>
              <p className={s.cardT}><Both d={it.text} m={it.textMobile} /></p>
              <Corner />
            </li>
          ))}
        </ul>
        {slide.bar && (
          <div className={s.bar} {...r(7)}>
            <p className={s.barH}>{slide.bar.title}</p>
            <p className={s.barT}><Both d={slide.bar.text} m={slide.bar.textMobile} /></p>
            <Corner />
          </div>
        )}
      </div>
    );

    case "money": return (
      <div className={s.slide}>
        <Head title={slide.title} lead={slide.lead} leadMobile={slide.leadMobile} width={slide.leadWidth} />
        <div className={s.regions}>
          {slide.regions.map((g, k) => (
            <div key={g.name} className={`${s.card} ${s.region}`} {...r(2 + k)}>
              <p className={s.regionH}>{g.name}</p>
              <p className={s.regionNote}>{g.note}</p>
              <ul className={s.rows}>
                {g.rows.map(([l, v]) => (
                  <li key={l} className={s.row}><span>{l}</span><b>{v}</b></li>
                ))}
              </ul>
              <p className={s.total}><span>{g.totalLabel}</span><b>{g.total}</b></p>
              <Corner />
            </div>
          ))}
        </div>
        <p className={`${s.moneyNote} ${ui.desktop}`} {...r(4)}>{slide.note}</p>
      </div>
    );

    case "rates": return (
      <div className={s.slide}>
        <Head title={slide.title} lead={slide.lead} width={slide.leadWidth} />
        <div className={s.regions}>
          {slide.cards.map((c, k) => (
            <div key={c.title} className={`${s.card} ${s.rate}`} {...r(2 + k)}>
              <h3 className={s.cardH}><Both d={c.title} m={c.titleMobile} /></h3>
              <p className={s.rateV}><b>{c.value}</b> <span>{c.alt}</span></p>
              <p className={s.rateP}>{c.per}</p>
              <Corner />
            </div>
          ))}
        </div>
        <div className={s.examples} {...r(4)}>
          <p className={`${s.examplesH} ${ui.desktop}`}>{slide.examplesTitle}</p>
          <ul className={s.rows}>
            {slide.examples.map(e => (
              <li key={e.label} className={s.row}>
                <span>{e.label}</span>
                <b>{e.value} <span className={s.or}>{slide.or}</span> {e.alt}</b>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );

    case "rules": return (
      <div className={s.slide}>
        <Head title={slide.title} lead={slide.lead} leadMobile={slide.leadMobile} width={slide.leadWidth} />
        <ul className={s.rules}>
          {slide.items.map((it, k) => (
            <li key={it.b} className={s.rule} {...r(2 + k)}>
              <i className={s.sq} aria-hidden="true" />
              <p><b>{it.b}</b>{" — "}{it.text}</p>
            </li>
          ))}
        </ul>
      </div>
    );

    case "apply": return <Apply slide={slide} />;
  }
}

/** Отклик: слева текст и контакты, справа форма. Уходит той же заявкой (lib/lead.ts). */
function Apply({ slide }: { slide: Extract<VacancySlide, { kind: "apply" }> }) {
  const F = slide.form;
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const get = (k: string) => String(d.get(k) ?? "").trim();
    setState("sending");
    try {
      // поля заявки не меняем: всё, кроме имени и контакта, — в message
      await sendLead({
        topic: F.topic,
        name: get("name"),
        contact: get("contact"),
        message: F.fields.filter(f => f.name !== "name" && f.name !== "contact").map(f => `${f.label}: ${get(f.name)}`).join("\n"),
        bonus: null,
      });
      setState("done");
    } catch {
      setState("error");
    }
  };

  return (
    <div className={`${s.slide} ${s.apply}`} data-note-above={slide.noteAbove ? "" : undefined}>
      <div className={s.applyText}>
        <h2 className={s.h} {...r(0)}>{lines(slide.title)}</h2>
        <p className={`${s.applyLead} ${ui.desktop}`} {...r(1)}>{slide.text}</p>
        <ul className={`${s.applyContacts} ${ui.desktop}`} {...r(2)}>
          {applyContacts.map(c => (
            <li key={c.label}>
              <span className={s.cLabel}>{c.label}</span>
              <a className={s.cValue} href={c.href} {...(/^https?:/.test(c.href) ? { target: "_blank", rel: "noreferrer" } : {})}>{c.value}</a>
            </li>
          ))}
        </ul>
      </div>
      <p className={`${s.applyNote} ${ui.mobile}`}>{slide.note}</p>

      <div className={s.formCard} {...r(3)}>
        {state === "done" ? (
          <p className={s.done}>{F.done}</p>
        ) : (
          <form className={s.form} onSubmit={submit}>
            <h3 className={`${s.formH} ${ui.desktop}`}>{F.title}</h3>
            {F.fields.map(f => (
              <label key={f.name} className={s.field}>
                <span className={s.fieldLabel}>{f.label}</span>
                <input
                  name={f.name} required placeholder={f.placeholder} type={f.type ?? "text"}
                  inputMode={f.type === "number" ? "numeric" : undefined}
                  autoComplete={f.name === "name" ? "name" : "off"}
                />
              </label>
            ))}
            <div className={s.submitRow}>
              <button className={ui.btn} type="submit" disabled={state === "sending"}>
                <span className={ui.desktop}>{F.submit}</span><span className={ui.mobile}>{F.submitMobile}</span>
              </button>
              <p className={`${s.privacy} ${ui.desktop}`} data-error={state === "error" ? "" : undefined}>
                {state === "error" ? F.error : F.privacy}
              </p>
            </div>
            {state === "error" && <p className={`${s.privacy} ${ui.mobile}`} data-error="">{F.error}</p>}
          </form>
        )}
        <Corner />
      </div>
    </div>
  );
}
