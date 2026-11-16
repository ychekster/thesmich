import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import type { Region } from "./content/kp";
import { KpApp } from "./kp/KpApp";
import "./styles/global.css";

/* Точка входа КП (/kp-kz/, /kp-ru/): регион — из data-region у #root. */
const root = document.getElementById("root")!;
const region: Region = root.dataset.region === "ru" ? "ru" : "kz";

createRoot(root).render(
  <StrictMode>
    <KpApp region={region} />
  </StrictMode>,
);
