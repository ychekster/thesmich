import { useState, type FormEvent } from "react";
import { contacts as text } from "../../content/home";
import { site } from "../../content/site";
import { sendLead } from "../../lib/lead";
import { useStore } from "../../lib/store";
import { Lines, r } from "../../pager/reveal";
import ui from "../ui.module.css";
import s from "./Contacts.module.css";

const ext = (href: string) => (/^https?:/.test(href) ? { target: "_blank", rel: "noreferrer" } : {});

/**
 * Контакты и форма заявки (макет 2026-11-17): на компьютере форма слева, контакты
 * справа; на телефоне — форма, под ней контакты строками. Бонус колеса и тема
 * заявки — из lib/store.ts. Отправка — только с галочкой согласия.
 */
export function Contacts() {
  const c = site.contacts, L = text.labels, F = text.form;
  const bonus = useStore(st => st.bonus);
  const topic = useStore(st => st.topic);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  const rows = [
    { label: L.phone, value: c.phone, href: c.phoneHref },
    { label: L.email, value: c.email, href: c.emailHref },
    { label: L.telegram, value: c.telegramNick, href: c.telegram },
  ];

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    setState("sending");
    try {
      await sendLead({
        topic: F.topics.find(t => t.id === topic)!.label,
        name: String(d.get("name") ?? "").trim(),
        contact: String(d.get("contact") ?? "").trim(),
        message: String(d.get("message") ?? "").trim(),
        bonus: topic === "site" ? bonus : null,
      });
      setState("done");
    } catch {
      setState("error");
    }
  };

  return (
    <div className={s.wrap}>
      <Lines lines={[text.title]} className={`${ui.h1} ${s.title}`} />
      <div className={s.cols}>
        <div className={s.card} {...r(1)}>
          {state === "done" ? (
            <div className={s.done}>
              <h3 className={s.cardTitle}>{F.doneTitle}</h3>
              <p className={s.doneText}>{F.doneText}</p>
              <button className={ui.btn} type="button" onClick={() => setState("idle")}>{F.again}</button>
            </div>
          ) : (
            <form className={s.form} onSubmit={submit}>
              <h3 className={s.cardTitle}>{F.title}</h3>
              <div className={s.pair}>
                <label className={s.field}>
                  <span className={s.fieldLabel}>{F.name}</span>
                  <input name="name" required autoComplete="name" />
                </label>
                <label className={s.field}>
                  <span className={s.fieldLabel}>{F.contact}</span>
                  <input name="contact" required autoComplete="tel" inputMode="tel" />
                </label>
              </div>
              <label className={s.field}>
                <span className={s.fieldLabel}>{F.message}</span>
                <textarea name="message" placeholder={F.messageHint} />
              </label>
              {bonus && topic === "site" && (
                <p className={s.bonus}><span>{F.bonus}:</span> {bonus}</p>
              )}
              <div className={s.submitRow}>
                <label className={s.consent}>
                  <input type="checkbox" name="consent" required />
                  <span>{F.consent} <a href={site.privacyHref}>{F.consentLink}</a></span>
                </label>
                <button className={ui.btn} type="submit" disabled={state === "sending"}>
                  {state === "sending" ? F.sending : F.submit}
                </button>
              </div>
              {state === "error" && <p className={s.error}>{F.error}</p>}
            </form>
          )}
          <span className={ui.corner} aria-hidden="true" />
        </div>

        {/* компьютер: подпись капсом над значением; телефон — строками «Подпись: значение» */}
        <ul className={s.rows} {...r(2)}>
          {rows.map(row => (
            <li key={row.label} className={s.row}>
              <span className={s.label}>{row.label}<span className={s.colon}>:</span></span>{" "}
              <a className={s.value} href={row.href} {...ext(row.href)}>{row.value}</a>
            </li>
          ))}
          <li className={`${s.row} ${s.city}`}>
            <span className={s.label}>{L.city}</span>
            <span className={s.value}>{c.city}</span>
            <span className={s.region}>{c.region}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
