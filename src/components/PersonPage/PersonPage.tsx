import { useMemo } from "react";
import { cardText, type Person } from "../../content/team";
import { TeamCard } from "../TeamCard/TeamCard";
import { contactRows } from "../TeamCard/faces";
import s from "./PersonPage.module.css";

/**
 * Страница-визитка одного человека: только карта во весь экран — больше на
 * странице ничего нет (решение владельца). Контакты — на обороте карты,
 * нажимаются прямо на ней.
 */
export function PersonPage({ person }: { person: Person }) {
  // оборот для экранных дикторов
  const backText = useMemo(
    () => [cardText.title, ...contactRows(person).map(r => `${r.label}: ${r.value}`)].join(". "),
    [person],
  );
  return (
    <main className={s.page}>
      <h1 className={s.srOnly}>{cardText.label(person)}</h1>
      <TeamCard person={person} slotClassName={s.slot} backText={backText} />
    </main>
  );
}
