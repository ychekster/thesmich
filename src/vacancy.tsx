import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import type { VacancySlug } from "./content/vacancies";
import { VacancyApp } from "./vacancy/VacancyApp";
import "./styles/global.css";

/* Точка входа страниц вакансий (/vacancy-manager/, /vacancy-author/): какая — из data-vacancy у #root. */
const root = document.getElementById("root")!;
const slug: VacancySlug = root.dataset.vacancy === "author" ? "author" : "manager";

createRoot(root).render(
  <StrictMode>
    <VacancyApp slug={slug} />
  </StrictMode>,
);
