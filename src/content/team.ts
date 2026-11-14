import { site } from "./site";

/**
 * Команда студии — визитки-удостоверения на отдельных страницах /yarik/ и /emir/.
 * На главной пока не упоминаются (см. docs/IDEAS.md).
 *
 * Данные-заглушки помечены TODO: их заменяет только владелец. Пустая фамилия
 * или пустой контакт — поле на карте и кнопка под ней просто не показываются.
 */

export interface Person {
  /** Адрес страницы: /<slug>/ (папка с index.html в корне проекта). */
  slug: "yarik" | "emir";
  name: string;
  surname: string;
  role: string;
  /** Номер удостоверения — для красоты, не документ. */
  number: string;
  /** Дата выдачи, ДД.ММ.ГГГГ. */
  issued: string;
  /** Фото — путь от public/ (например "/team/yarik.jpg"). Пусто — монограмма. */
  photo: string;
  contacts: {
    phone: string;      // как показать
    phoneHref: string;  // tel:+7…
    telegram: string;   // ссылка https://t.me/…
    instagram: string;  // ссылка https://instagram.com/…
    email: string;
  };
}

export const TEAM: Record<Person["slug"], Person> = {
  yarik: {
    slug: "yarik",
    name: "Ярик",
    surname: "", // TODO: фамилия
    role: "Сооснователь", // TODO: должность, если нужна другая
    number: "TS 000001",
    issued: "15.11.2026",
    photo: "", // TODO: фото → public/team/yarik.jpg
    contacts: {
      phone: site.contacts.phone, // TODO: личный номер
      phoneHref: site.contacts.phoneHref,
      telegram: site.contacts.telegram, // TODO
      instagram: site.contacts.instagram, // TODO
      email: site.contacts.email, // TODO
    },
  },
  emir: {
    slug: "emir",
    name: "Эмир",
    surname: "", // TODO: фамилия
    role: "Сооснователь", // TODO
    number: "TS 000002",
    issued: "15.11.2026",
    photo: "", // TODO: фото → public/team/emir.jpg
    contacts: {
      phone: site.contacts.phone, // TODO: личный номер
      phoneHref: site.contacts.phoneHref,
      telegram: site.contacts.telegram, // TODO
      instagram: site.contacts.instagram, // TODO
      email: site.contacts.email, // TODO
    },
  },
};

/** Подписи удостоверения: по-казахски и по-русски, как на настоящих картах РК. */
export const idText = {
  kicker: ["Студия куәлігі", "Удостоверение студии"],
  fields: {
    surname: "Тегі / Фамилия",
    name: "Аты / Имя",
    role: "Лауазымы / Должность",
    issued: "Берілген күні / Выдано",
    valid: "Жарамды / Действует",
  },
  validValue: "Мерзімсіз / Бессрочно",
  contacts: { phone: "Телефон", telegram: "Telegram", instagram: "Instagram", email: "Почта" },
  qrNote: "Наведите камеру — визитка откроется на телефоне",
  /** Кнопки под картой — контакты должны быть кликабельными. */
  actions: { call: "Позвонить", telegram: "Telegram", instagram: "Instagram", save: "В контакты", site: "Сайт студии" },
  label: (p: Person) => `Удостоверение: ${p.name}${p.surname ? " " + p.surname : ""}, ${site.brand}`,
};
