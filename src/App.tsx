import { useMemo } from "react";
import { Header } from "./components/Header/Header";
import { Pager, type Page } from "./pager/Pager";
import { Hero } from "./sections/Hero/Hero";
import { About } from "./sections/About/About";
import { Sites } from "./sections/Sites/Sites";
import { Channels } from "./sections/Channels/Channels";
import { Promo } from "./sections/Promo/Promo";
import { Wheel } from "./sections/Wheel/Wheel";
import { Partners } from "./sections/Partners/Partners";
import { Contacts } from "./sections/Contacts/Contacts";

/**
 * Главная — полноэкранные секции (план — docs/PLAN.md). Порядок, якоря (#id),
 * фоны и темы — здесь. Секции рисуются один раз: App не перерисовывается.
 */
export default function App() {
  const pages = useMemo<Page[]>(() => [
    { id: "top", label: "Главная", bg: "ink", theme: "dark", node: <Hero /> },
    { id: "about", label: "О студии", bg: "red", theme: "accent", node: <About /> },
    { id: "sites", label: "Какие сайты делаем", bg: "smoke", theme: "light", node: <Sites /> },
    { id: "channels", label: "Каналы продвижения", bg: "red", theme: "accent", node: <Channels /> },
    { id: "promo", label: "Промо-ролик", bg: "ink", theme: "dark", node: <Promo /> },
    { id: "bonus", label: "Колесо бонусов", bg: "mist", theme: "light", node: <Wheel /> },
    { id: "partners", label: "Карьера", bg: "ink", theme: "dark", node: <Partners /> },
    { id: "contacts", label: "Контакты", bg: "white", theme: "light", node: <Contacts /> },
  ], []);

  return (
    <>
      <Header />
      <Pager pages={pages} />
    </>
  );
}
