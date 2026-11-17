import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PrivacyPage } from "./privacy/PrivacyPage";
import "./styles/global.css";

/* Точка входа страницы политики конфиденциальности (/privacy/). */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PrivacyPage />
  </StrictMode>,
);
