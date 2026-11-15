import { cardText, type Person } from "../content/team";
import { TeamCard } from "./TeamCard";
import s from "./PersonPage.module.css";

/**
 * Страница-визитка одного человека: только карта во весь экран — больше на
 * странице ничего нет (решение владельца). Контакты — на обороте карты.
 */
export function PersonPage({ person }: { person: Person }) {
  return (
    <main className={s.page}>
      <h1 className={s.srOnly}>{cardText.label(person)}</h1>
      <TeamCard person={person} />
    </main>
  );
}
