/**
 * Бренд и контакты. Всё, что встречается в шапке и футере, — здесь.
 * Значения-заглушки помечены TODO: их нужно заменить на настоящие.
 */
export const site = {
  brand: "The Smich",
  tagline: "Каталоги и интернет-магазины под ключ",
  about: "Делаем сайты-каталоги и интернет-магазины под ключ и приводим на них покупателей.",
  contacts: {
    phone: "+7 700 000 00 00", // TODO: настоящий номер
    phoneHref: "tel:+77000000000",
    email: "hello@example.com", // TODO: настоящая почта
    telegram: "https://t.me/your_username", // TODO
    instagram: "https://instagram.com/your_username", // TODO
  },
  privacyHref: "#privacy", // TODO: страница политики конфиденциальности
} as const;
