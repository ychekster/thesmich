import { site } from "./site";

/**
 * Команда студии — электронные визитки на страницах /yarik/ и /emir/.
 * Задача визитки — доверие и связь (так делают Blinq, HiHello): живое фото,
 * полное имя, кто ты и где работаешь, чем занимаешься, мессенджеры, призыв
 * к действию. Лицо — «кто это», оборот — «как связаться» (нажимается прямо
 * на карте), QR на обороте сразу сохраняет контакт в телефон.
 * На главной пока не упоминаются (см. docs/IDEAS.md).
 *
 * Заглушки помечены TODO — заменяет только владелец. Пустое поле на карте
 * не показывается.
 */

export interface Person {
  /** Адрес страницы: /<slug>/ (папка с index.html в корне проекта). */
  slug: "yarik" | "emir";
  name: string;
  surname: string;
  role: string;
  /** Фото — путь от public/ (например "/team/yarik.jpg"). Пусто — монограмма. */
  photo: string;
  contacts: {
    phone: string;      // как показать
    phoneHref: string;  // tel:+7…
    whatsapp: string;   // https://wa.me/7…
    telegram: string;   // https://t.me/…
    instagram: string;  // https://instagram.com/… (пусто — не показываем)
    email: string;
  };
}

/** Общее для обеих визиток: студия, чем занимаемся, где работаем. */
export const studio = {
  tagline: "Сайты-каталоги и интернет-магазины под ключ",
  area: "Работаем по всему Казахстану",
  /** БИН/ИИН студии — сильный сигнал доверия в РК. Пусто — не показываем (не выдумывать!). */
  bin: "", // TODO: когда появится ИП/ТОО
};

const PHONE = site.contacts.phone; // TODO: настоящий общий номер (он же WhatsApp)
const phoneHref = site.contacts.phoneHref;
const whatsapp = "https://wa.me/" + phoneHref.replace(/\D/g, "");

export const TEAM: Record<Person["slug"], Person> = {
  yarik: {
    slug: "yarik",
    name: "Ярик",
    surname: "Чекстер",
    role: "Сооснователь",
    photo: "", // TODO: фото → public/team/yarik.jpg
    contacts: {
      phone: PHONE,
      phoneHref,
      whatsapp,
      telegram: site.contacts.telegram, // TODO: личный Telegram
      instagram: "",
      email: site.contacts.email, // TODO: почта (пусто — строка пропадёт)
    },
  },
  emir: {
    slug: "emir",
    name: "Эмир",
    surname: "Абылгазиев",
    role: "Сооснователь",
    photo: "", // TODO: фото → public/team/emir.jpg
    contacts: {
      phone: PHONE,
      phoneHref,
      whatsapp,
      telegram: site.contacts.telegram, // TODO: личный Telegram
      instagram: "",
      email: site.contacts.email, // TODO
    },
  },
};

/** Подписи визитки (только по-русски). */
export const cardText = {
  roleAt: (p: Person) => `${p.role} студии ${site.brand}`,
  bin: "БИН",
  /** Оборот. */
  title: "Связаться со мной",
  contacts: { whatsapp: "WhatsApp", telegram: "Telegram", phone: "Телефон", instagram: "Instagram", email: "Почта" },
  save: "Сохранить контакт",
  quiz: "Рассчитать стоимость сайта",
  qrNote: "Наведите камеру — контакт сохранится в телефон",
  label: (p: Person) => `Визитка: ${p.name} ${p.surname}, ${site.brand}`,
};
