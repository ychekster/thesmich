/**
 * Бренд, контакты, адреса страниц и общие подписи (шапка, кнопка заявки).
 * Контакты — из макета владельца (2026-11-17), одни на сайте, в КП, вакансиях и футере.
 */
const phone = "+7 747 889-17-49";
const email = "ychekster@gmail.com";
const telegram = "@lausardens";

export const site = {
  brand: "The Smich",
  /** Кнопка в шапке — ведёт к секции контактов. */
  cta: "Оставить заявку",
  /** Меню: на компьютере — в шапке, на телефоне — за бургером. Пункт → id секции главной (App.tsx). */
  menu: [
    { label: "О студии", to: "about" },
    { label: "Сайты", to: "sites" },
    { label: "Продвижение", to: "channels" },
    { label: "Бонусы", to: "bonus" },
    { label: "Контакты", to: "contacts" },
  ],
  menuLabel: "Меню",
  menuOpen: "Открыть меню",
  menuClose: "Закрыть меню",
  contacts: {
    phone,
    phoneHref: "tel:+77478891749",
    whatsappHref: "https://wa.me/77478891749",
    email,
    emailHref: `mailto:${email}`,
    telegram: "https://t.me/lausardens",
    telegramNick: telegram,
    city: "Алматы",
    region: "Работаем по Казахстану и России",
  },
  /** Адреса страниц (у каждой — своя папка с index.html, список — vite.config.ts). */
  pages: {
    home: "/",
    kpKz: "/kp-kz/",
    kpRu: "/kp-ru/",
    /** PDF-версии КП: в макете ссылки-заглушки. TODO: положить файлы в public/ и вписать адреса. */
    pdfKz: "",
    pdfRu: "",
    manager: "/vacancy-manager/",
    author: "/vacancy-author/",
    yarik: "/yarik/",
    emir: "/emir/",
    privacy: "/privacy/",
  },
  privacyHref: "/privacy/",
} as const;

/** Меню сайта для других страниц (вакансии, политика): ссылки на секции главной. */
export const siteMenuAbroad = site.menu.map(m => ({ label: m.label, href: `/#${m.to}` }));
