import { site } from "./site";

/**
 * Визитка студии — большая карта в духе банковской между первым экраном и
 * частыми вопросами. Лицо: логотип, чип, «номер карты» = телефон, держатель
 * и срок. Оборот: магнитная полоса, поле подписи, контакты.
 * Контакты берутся из site.ts — меняются там.
 */

const handle = (url: string) => "@" + url.replace(/\/+$/, "").split("/").pop();

export const card = {
  /** Подпись для экранных дикторов. */
  label: `Визитка студии ${site.brand}`,
  front: {
    kicker: "Сайты · Магазины · Продвижение",
    /** Вместо номера карты — телефон. */
    number: site.contacts.phone,
    fields: [
      { label: "Держатель", value: "Ваш бизнес" },
      { label: "Действует", value: "Бессрочно" },
    ],
  },
  back: {
    signature: site.brand,
    /** Код в квадратике рядом с подписью (как CVC). */
    code: "KZ",
    contacts: [
      { label: "Телефон", value: site.contacts.phone },
      { label: "Почта", value: site.contacts.email },
      { label: "Telegram", value: handle(site.contacts.telegram) },
      { label: "Instagram", value: handle(site.contacts.instagram) },
    ],
    note: site.about,
  },
} as const;

/** Текст оборота для экранных дикторов. */
export const cardBackText = card.back.contacts.map(c => `${c.label}: ${c.value}`).join(". ");
