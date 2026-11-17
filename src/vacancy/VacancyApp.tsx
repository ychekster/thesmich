import { useMemo } from "react";
import { Footer } from "../components/Footer/Footer";
import { Header } from "../components/Header/Header";
import { siteMenuAbroad } from "../content/site";
import { VACANCIES, type VacancySlide, type VacancySlug } from "../content/vacancies";
import { Pager, type Backdrop, type Page, type Theme } from "../pager/Pager";
import { VacancySlideView } from "./Slides";

/** Фон и тема слайда по его виду (макет: тёмный, серый, красный, белый, светло-серый, тёмный). */
const look = (sl: VacancySlide): { bg: Backdrop; theme: Theme } => {
  switch (sl.kind) {
    case "title": case "apply": return { bg: "ink", theme: "dark" };
    case "cards": return { bg: sl.bg, theme: "light" };
    case "money": case "rates": return { bg: "red", theme: "accent" };
    case "rules": return { bg: "white", theme: "light" };
  }
};

/**
 * Страница вакансии (/vacancy-manager/, /vacancy-author/) — те же полноэкранные
 * секции, что на главной: 6 слайдов и футер. Шапка — меню сайта (ссылки на главную)
 * и кнопка «Откликнуться» к последнему слайду. Тексты — content/vacancies.ts.
 */
export function VacancyApp({ slug }: { slug: VacancySlug }) {
  const v = VACANCIES[slug];
  const pages = useMemo<Page[]>(() => [
    ...v.slides.map(sl => ({ id: sl.id, label: sl.title.join(" "), ...look(sl), node: <VacancySlideView slide={sl} /> })),
    { id: "footer", label: "Связаться", bg: "ink", theme: "dark", node: <Footer />, meter: false },
  ], [v]);

  return (
    <>
      <Header cta={{ label: v.cta, to: "apply" }} menu={siteMenuAbroad} home="/" />
      <Pager pages={pages} />
    </>
  );
}
