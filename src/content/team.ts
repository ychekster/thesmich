import { site } from "./site";

/**
 * Команда студии — электронные визитки на страницах /yarik/ и /emir/.
 * Дизайн — по образцу владельца: вертикальная карта, лицо — фото во весь
 * размер и крупное имя по центру; оборот — светлый: роль сверху, QR в центре,
 * имя и контакты внизу (нажимаются прямо на карте). QR — vCard: камера сразу
 * сохраняет контакт, а нажатие по нему скачивает контакт файлом.
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
  /** Оборот, сверху — жирно, строчными, в две строки (как на образце владельца). */
  roleLines: (p: Person) => [p.role.toLowerCase(), `студии ${site.brand}`.toLowerCase()],
  bin: "БИН",
  /** Для экранных дикторов: начало озвучки оборота. */
  title: "Связаться со мной",
  contacts: { whatsapp: "WhatsApp", telegram: "Telegram", phone: "Телефон", instagram: "Instagram", email: "Почта" },
  /** Подпись ссылки на QR: нажатие по QR скачивает контакт (.vcf). */
  save: "Сохранить контакт",
  label: (p: Person) => `Визитка: ${p.name} ${p.surname}, ${site.brand}`,
};
