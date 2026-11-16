/**
 * Бренд, контакты и общие подписи (шапка, кнопка заявки).
 * Значения-заглушки помечены TODO: их заменяет только владелец.
 */
export const site = {
  brand: "The Smich",
  /** Кнопка в шапке и на первом экране — ведёт к секции контактов. */
  cta: "Оставить заявку",
  /** Меню телефона (бургер в шапке): пункт → id секции главной (App.tsx). */
  menu: [
    { label: "О студии", to: "about" },
    { label: "Сайты", to: "sites" },
    { label: "Продвижение", to: "channels" },
    { label: "Бонусы", to: "bonus" },
    { label: "Контакты", to: "contacts" },
  ],
  menuLabel: "Меню",
  menuOpen: "Открыть меню",
  menuClose: "Закрыть меню",
  contacts: {
    phone: "+7 700 000 00 00", // TODO: настоящий номер
    phoneHref: "tel:+77000000000",
    email: "hello@example.com", // TODO: настоящая почта
    telegram: "https://t.me/your_username", // TODO
    instagram: "https://instagram.com/your_username", // TODO
    city: "Алматы · работаем по Казахстану и России", // из макета владельца (2026-11-16)
  },
  privacyHref: "#privacy", // TODO: страница политики конфиденциальности
} as const;
