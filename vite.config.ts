import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

/* Несколько страниц: главная и визитки команды (/yarik/, /emir/) — у каждой свой
   index.html, поэтому работают на любом статическом хостинге без переадресаций. */
const page = (p: string) => resolve(import.meta.dirname, p);

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      input: { main: page("index.html"), yarik: page("yarik/index.html"), emir: page("emir/index.html") },
    },
  },
});
