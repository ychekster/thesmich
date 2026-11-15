import { useState, type FormEvent } from "react";
import { contacts as text, type TopicId } from "../../content/home";
import { site } from "../../content/site";
import { sendLead } from "../../lib/lead";
import { store, useStore } from "../../lib/store";
import { Lines, r } from "../../pager/reveal";
import ui from "../ui.module.css";
import s from "./Contacts.module.css";

const handle = (url: string) => "@" + url.replace(/\/+$/, "").split("/").pop();

/** Контакты и форма обратной связи (заявка). Бонус колеса и тема — из lib/store.ts. */
export function Contacts() {
  const c = site.contacts, L = text.labels, F = text.form;
  const bonus = useStore(st => st.bonus);
  const topic = useStore(st => st.topic);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  const rows = [
    { label: L.phone, value: c.phone, href: c.phoneHref },
    { label: L.telegram, value: handle(c.telegram), href: c.telegram },
    { label: L.instagram, value: handle(c.instagram), href: c.instagram },
    { label: L.email, value: c.email, href: `mailto:${c.email}` },
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
      <div className={s.info}>
        <p className={ui.eyebrow} {...r(0)}>{text.eyebrow}</p>
        <Lines lines={text.title} className={`${ui.title} ${s.title}`} from={1} />
        <p className={ui.lead} {...r(3)}>{text.lead}</p>
        <ul className={s.rows}>
          {rows.map((row, k) => (
            <li key={row.label} {...r(4 + k)}>
              <a className={s.row} href={row.href} {...(/^https?:/.test(row.href) ? { target: "_blank", rel: "noreferrer" } : {})}>
                <span className={s.rowLabel}>{row.label}</span>
                <span className={s.rowValue}>{row.value}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className={s.card} {...r(2)}>
        {state === "done" ? (
          <div className={s.done}>
            <h3 className={s.doneTitle}>{F.doneTitle}</h3>
            <p className={s.doneText}>{F.doneText}</p>
            <button className={`${ui.btn} ${ui.ghost}`} type="button" onClick={() => setState("idle")}>{F.again}</button>
          </div>
        ) : (
          <form className={s.form} onSubmit={submit}>
            <div className={s.topics} role="radiogroup">
              {F.topics.map(t => (
                <button
                  key={t.id} type="button" role="radio" aria-checked={topic === t.id}
                  className={s.topic} onClick={() => store.set({ topic: t.id as TopicId })}
                >{t.label}</button>
              ))}
            </div>
            <label className={s.field}>
              <span className={s.srOnly}>{F.name}</span>
              <input name="name" required autoComplete="name" placeholder={F.name} />
            </label>
            <label className={s.field}>
              <span className={s.srOnly}>{F.contact}</span>
              <input name="contact" required autoComplete="tel" placeholder={F.contact} />
            </label>
            <label className={s.field}>
              <span className={s.srOnly}>{F.message}</span>
              <textarea name="message" rows={3} placeholder={F.message} />
            </label>
            {bonus && topic === "site" && (
              <p className={s.bonus}><span>{F.bonus}</span>{bonus}</p>
            )}
            <button className={`${ui.btn} ${s.submit}`} type="submit" disabled={state === "sending"}>
              {state === "sending" ? F.sending : F.submit}
            </button>
            <p className={s.privacy}>
              {state === "error" ? F.error : F.privacy}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
