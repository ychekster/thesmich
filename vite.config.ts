import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

/* Несколько страниц: главная, визитки команды (/yarik/, /emir/), КП (/kp-kz/, /kp-ru/), вакансии
   (/vacancy-manager/, /vacancy-author/) и политика (/privacy/) — у каждой свой
   index.html, поэтому работают на любом статическом хостинге без переадресаций. */
const page = (p: string) => resolve(import.meta.dirname, p);

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      input: {
        main: page("index.html"),
        yarik: page("yarik/index.html"), emir: page("emir/index.html"),
        "kp-kz": page("kp-kz/index.html"), "kp-ru": page("kp-ru/index.html"),
        "vacancy-manager": page("vacancy-manager/index.html"), "vacancy-author": page("vacancy-author/index.html"),
        privacy: page("privacy/index.html"),
      },
    },
  },
});
