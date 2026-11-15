/**
 * Бренд, контакты и общие подписи (шапка, кнопка заявки).
 * Значения-заглушки помечены TODO: их заменяет только владелец.
 */
export const site = {
  brand: "The Smich",
  /** Кнопка в шапке и на первом экране — ведёт к секции контактов. */
  cta: "Оставить заявку",
  contacts: {
    phone: "+7 700 000 00 00", // TODO: настоящий номер
    phoneHref: "tel:+77000000000",
    email: "hello@example.com", // TODO: настоящая почта
    telegram: "https://t.me/your_username", // TODO
    instagram: "https://instagram.com/your_username", // TODO
    city: "Казахстан", // TODO: город/адрес, если нужен
  },
  privacyHref: "#privacy", // TODO: страница политики конфиденциальности
} as const;
