import { useMemo } from "react";
import { idText, type Person } from "../../content/team";
import { IdCard } from "../IdCard/IdCard";
import s from "./PersonPage.module.css";

/**
 * Страница-визитка одного человека: только удостоверение во весь экран —
 * больше на странице ничего нет (решение владельца). Контакты — на обороте
 * карты и в QR.
 */
export function PersonPage({ person }: { person: Person }) {
  const c = person.contacts, L = idText.contacts;
  // оборот для экранных дикторов
  const backText = useMemo(
    () => [[L.phone, c.phone], [L.telegram, c.telegram], [L.instagram, c.instagram], [L.email, c.email]]
      .filter(([, v]) => v).map(([l, v]) => `${l}: ${v}`).join(". "),
    [c, L],
  );
  return (
    <main className={s.page}>
      <h1 className={s.srOnly}>{idText.label(person)}</h1>
      <IdCard person={person} slotClassName={s.slot} backText={backText} />
    </main>
  );
}
