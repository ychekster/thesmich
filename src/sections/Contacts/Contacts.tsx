import { useState, type FormEvent } from "react";
import { contacts as text } from "../../content/home";
import { site } from "../../content/site";
import { sendLead } from "../../lib/lead";
import { useStore } from "../../lib/store";
import { Lines, r } from "../../pager/reveal";
import ui from "../ui.module.css";
import s from "./Contacts.module.css";

const handle = (url: string) => "@" + url.replace(/\/+$/, "").split("/").pop();

/** Контакты и форма заявки. Бонус колеса и тема заявки — из lib/store.ts. */
export function Contacts() {
  const c = site.contacts, L = text.labels, F = text.form;
  const bonus = useStore(st => st.bonus);
  const topic = useStore(st => st.topic);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  const rows: { label: string; value: string; href?: string }[] = [
    { label: L.city, value: c.city },
    { label: L.phone, value: c.phone, href: c.phoneHref },
    { label: L.email, value: c.email, href: `mailto:${c.email}` },
    { label: L.instagram, value: handle(c.instagram), href: c.instagram },
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
        <ul className={s.rows}>
          {rows.map((row, k) => (
            <li key={row.label} className={s.row} {...r(1 + k)}>
              <span className={s.label}>{row.label}<span className={s.colon}>:</span></span>{" "}
              {row.href ? (
                <a className={s.value} href={row.href} {...(/^https?:/.test(row.href) ? { target: "_blank", rel: "noreferrer" } : {})}>{row.value}</a>
              ) : (
                <span className={s.value}>{row.value}</span>
              )}
            </li>
          ))}
        </ul>

        <div className={s.card} {...r(5)}>
          {state === "done" ? (
            <div className={s.done}>
              <h3 className={s.cardTitle}>{F.doneTitle}</h3>
              <p className={s.doneText}>{F.doneText}</p>
              <button className={ui.btn} type="button" onClick={() => setState("idle")}>{F.again}</button>
            </div>
          ) : (
            <form className={s.form} onSubmit={submit}>
              <h3 className={s.cardTitle}>{F.title}</h3>
              <label className={s.field}>
                <span className={s.fieldLabel}>{F.name}</span>
                <input name="name" required autoComplete="name" />
              </label>
              <label className={s.field}>
                <span className={s.fieldLabel}>{F.contact}</span>
                <input name="contact" required autoComplete="tel" inputMode="tel" />
              </label>
              <label className={s.field}>
                <span className={s.fieldLabel}>{F.message}</span>
                <textarea name="message" placeholder={F.messageHint} />
              </label>
              {bonus && topic === "site" && (
                <p className={s.bonus}><span>{F.bonus}:</span> {bonus}</p>
              )}
              <div className={s.submitRow}>
                <button className={ui.btn} type="submit" disabled={state === "sending"}>
                  {state === "sending" ? F.sending : F.submit}
                </button>
                <p className={s.privacy} data-error={state === "error" ? "" : undefined}>
                  {state === "error" ? F.error : F.privacy}
                </p>
              </div>
            </form>
          )}
          <span className={ui.corner} aria-hidden="true" />
        </div>
      </div>
      <p className={s.copy}>{text.copyright}</p>
    </div>
  );
}
