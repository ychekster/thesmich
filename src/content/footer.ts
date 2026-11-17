/**
 * Футер — последний экран сайта, КП, обеих вакансий и политики (не визиток).
 * Содержимое везде одинаковое (макет 2026-11-17); шапка над ним — шапка страницы.
 * desktop: true — пункт только на компьютере; mobileLabel — другая подпись на телефоне.
 */
import { site } from "./site";

const P = site.pages, C = site.contacts;

export interface FooterLink { label: string; href: string; mobileLabel?: string; desktop?: boolean }
export interface FooterColumn { title: string; links: FooterLink[] }

export const footer = {
  title: "Связаться",
  contacts: [
    { label: "Звонки и\u00a0WhatsApp", value: "+7\u00a0747\u00a0889-17-49", href: C.phoneHref },
    { label: "Почта", value: C.email, href: C.emailHref },
    { label: "Telegram", value: C.telegramNick, href: C.telegram, desktop: true },
  ],
  /** Колонки на компьютере — в этом порядке; на телефоне две: [разделы, визитки] и [цены, вакансии]. */
  sections: {
    title: "Разделы",
    links: [
      { label: "Главная", href: "/#top", desktop: true },
      { label: "О\u00a0студии", href: "/#about" },
      { label: "Какие сайты делаем", href: "/#sites" },
      { label: "Каналы продвижения", href: "/#channels" },
      { label: "Этапы разработки", href: "/#build" },
      { label: "Этапы продвижения", href: "/#growth" },
      { label: "Промо-ролик", href: "/#promo" },
      { label: "Колесо бонусов", href: "/#bonus" },
      { label: "Контакты", href: "/#contacts" },
      { label: "Вакансии", href: "/#partners" },
    ],
  } as FooterColumn,
  prices: {
    title: "Цены и\u00a0условия",
    links: [
      { label: "Казахстан,\u00a0₸", href: P.kpKz },
      { label: "Россия,\u00a0₽", href: P.kpRu },
      { label: "PDF для\u00a0Казахстана", href: P.pdfKz },
      { label: "PDF для\u00a0России", href: P.pdfRu },
    ],
  } as FooterColumn,
  jobs: {
    title: "Вакансии",
    links: [
      { label: "Менеджер", mobileLabel: "Менеджер по\u00a0продажам", href: P.manager },
      { label: "Автор видео", href: P.author },
    ],
  } as FooterColumn,
  cards: {
    title: "Визитки",
    links: [
      { label: "Ярослав", href: P.yarik },
      { label: "Эмир", href: P.emir },
    ],
  } as FooterColumn,
  copyright: "©\u00a02026\u00a0The\u00a0Smich. Сайты и\u00a0продвижение для\u00a0бизнеса",
  copyrightMobile: "©\u00a02026\u00a0The\u00a0Smich",
  privacy: "Политика конфиденциальности",
  privacyHref: P.privacy,
};
