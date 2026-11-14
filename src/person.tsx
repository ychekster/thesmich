import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TEAM, type Person } from "./content/team";
import { PersonPage } from "./components/PersonPage/PersonPage";
import "./styles/global.css";

/* Точка входа страниц-визиток (/yarik/, /emir/): чья — из data-person у #root. */
const root = document.getElementById("root")!;
const person = TEAM[root.dataset.person as Person["slug"]];

createRoot(root).render(
  <StrictMode>
    <PersonPage person={person} />
  </StrictMode>,
);
