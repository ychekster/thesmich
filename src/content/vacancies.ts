/**
 * Страницы вакансий: /vacancy-manager/ и /vacancy-author/ (макет Claude Design,
 * 2026-11-17): по 6 полноэкранных слайдов + футер. Порядок слайдов — порядок в
 * массиве `slides`, фон и вид слайда — поле `kind` (вёрстка — src/vacancy/Slides.tsx).
 *
 * Заглавные буквы в заголовках ставит CSS. Заголовок — массив строк. `…Mobile` —
 * если на телефоне текст другой; "" — на телефоне текста нет. "\n" — перенос
 * строки только на компьютере. Неразрывные пробелы — из макета, не терять.
 *
 * Внимание: здесь 60% называются открыто — так в макете владельца (страница для
 * кандидатов). На главной в подписи вакансии цифру по-прежнему не пишем (home.ts).
 */
import { site } from "./site";

export type VacancySlug = "manager" | "author";

export interface CardItem { title: string; text: string; textMobile?: string; titleMobile?: string }

export type VacancySlide =
  | { kind: "title"; id: string; eyebrow: string; title: string[]; titleMobile: string[]; text: string; size: number; sizeMobile: number }
  | Lead & {
    kind: "cards"; id: string; bg: "smoke" | "mist"; title: string[]; lead: string; leadMobile?: string;
    numbered: boolean; cols: number; mobileCols: number; items: CardItem[];
    /** Тёмная плашка под карточками («Требования»). */
    bar?: { title: string; text: string; textMobile: string };
  }
  | Lead & {
    kind: "money"; id: string; title: string[]; lead: string; leadMobile: string;
    regions: { name: string; note: string; rows: [string, string][]; totalLabel: string; total: string }[];
    note: string;
  }
  | Lead & {
    kind: "rates"; id: string; title: string[]; lead: string;
    cards: { title: string; titleMobile?: string; value: string; alt: string; per: string }[];
    examplesTitle: string; examples: { label: string; value: string; alt: string }[]; or: string;
  }
  | Lead & { kind: "rules"; id: string; title: string[]; lead: string; leadMobile?: string; items: { b: string; text: string }[] }
  | {
    kind: "apply"; id: string; title: string[]; text: string;
    /** Строка с контактами на телефоне (вместо текста и контактов слева); noteAbove — над формой, иначе под ней. */
    note: string; noteAbove?: boolean;
    form: { title: string; topic: string; fields: { name: string; label: string; placeholder?: string; type?: string }[]; submit: string; submitMobile: string; privacy: string; done: string; error: string };
  };

/** Ширина фразы справа от заголовка на компьютере, px макета (по умолчанию 620). */
type Lead = { leadWidth?: number };

export interface Vacancy {
  title: string;
  description: string;
  /** Кнопка в шапке — к слайду отклика. */
  cta: string;
  slides: VacancySlide[];
}

const C = site.contacts;
/** Подписи контактов на слайде отклика. */
export const applyContacts = [
  { label: "Звонки и WhatsApp", value: "+7 747 889-17-49", href: C.phoneHref },
  { label: "Telegram", value: C.telegramNick, href: C.telegram },
  { label: "Почта", value: C.email, href: C.emailHref },
];

const formCommon = {
  privacy: "Нажимая кнопку, вы соглашаетесь на обработку персональных данных",
  done: "Спасибо! Ответим в ближайшее время.",
  error: "Не получилось отправить. Напишите нам напрямую.",
};

export const VACANCIES: Record<VacancySlug, Vacancy> = {
  manager: {
    title: "Менеджер по привлечению клиентов — The Smich",
    description: "Находите бизнесы, которым нужен сайт, и получайте 60% с каждого платежа клиента. Удалённо и без опыта.",
    cta: "Откликнуться",
    slides: [
      {
        kind: "title", id: "top", eyebrow: "Вакансия в The Smich",
        title: ["Менеджер", "по привлечению", "клиентов"], titleMobile: ["Менеджер по", "привлечению", "клиентов"],
        text: "Находите бизнесы, которым нужен сайт, и получайте 60% с каждого платежа клиента. Удалённо и без опыта.",
        size: 118, sizeMobile: 34,
      },
      {
        kind: "cards", id: "work", bg: "smoke", title: ["Что нужно", "делать"],
        lead: "Ваша задача — найти заинтересованного человека. Остальное делаем мы.",
        numbered: true, cols: 3, mobileCols: 1,
        items: [
          { title: "Находите", text: "Ищете бизнесы, которым нужен сайт или новые клиенты. Любые каналы: знакомые, мессенджеры, соцсети, звонки." },
          { title: "Передаёте", text: "Человек заинтересовался, вы отправляете нам его контакт. Созвон, продажа и вся работа дальше на нас.", textMobile: "Человек заинтересовался — отправляете нам его контакт. Созвон, продажа и вся работа дальше на нас." },
          { title: "Получаете", text: "Клиент платит нам, и мы сразу переводим вам 60% от каждого его платежа." },
        ],
      },
      {
        kind: "money", id: "money", leadWidth: 640, title: ["60% с каждого", "платежа"],
        lead: "Клиент платит частями, а вы получаете\nсвою долю с каждой части сразу.",
        leadMobile: "Клиент платит частями — вы получаете долю с каждой части сразу.",
        regions: [
          {
            name: "Казахстан", note: "Лендинг 150 000 ₸ и продвижение 60 000 ₸ в месяц",
            rows: [["Предоплата 30%", "27 000 ₸"], ["После дизайна 40%", "36 000 ₸"], ["При запуске 30%", "27 000 ₸"], ["Первый месяц продвижения", "36 000 ₸"]],
            totalLabel: "Итого", total: "126 000 ₸",
          },
          {
            name: "Россия", note: "Лендинг 35 000 ₽ и продвижение 15 000 ₽ в месяц",
            rows: [["Предоплата 30%", "6 300 ₽"], ["После дизайна 40%", "8 400 ₽"], ["При запуске 30%", "6 300 ₽"], ["Первый месяц продвижения", "9 000 ₽"]],
            totalLabel: "Итого", total: "30 000 ₽",
          },
        ],
        note: "Пример для самого простого заказа. Чем больше заказ, тем больше выплата: с интернет-магазина за 450 000 ₸ только за сайт вы получите 270 000 ₸.",
      },
      {
        kind: "rules", id: "rules", leadWidth: 720, title: ["Правила"],
        lead: "Простые договорённости, чтобы всем было честно.",
        items: [
          { b: "Клиент засчитывается вам", text: "если он сам назвал вас или вы первым прислали нам его контакт." },
          { b: "Платим с первого заказа", text: "сайт и первый месяц продвижения. С повторных заказов и следующих месяцев выплат нет." },
          { b: "Без спама", text: "никаких массовых рассылок и навязчивых сообщений." },
          { b: "Скидки только через нас", text: "не обещайте клиенту скидок и бонусов, не согласовав их с нами." },
          { b: "Бережём репутацию", text: "любые способы, которые не вредят имени студии. Каналы выбираете сами." },
        ],
      },
      {
        kind: "cards", id: "support", bg: "mist", title: ["Что мы даём"],
        lead: "Всё, чтобы вы могли начать в первый же день.", leadMobile: "",
        numbered: false, cols: 4, mobileCols: 2,
        items: [
          { title: "Коммерческое предложение", text: "Готовое КП, которое можно сразу отправить клиенту." },
          { title: "Скрипты и шаблоны", text: "Тексты первых сообщений, примеры диалогов и ответы на частые вопросы." },
          { title: "Обучение", text: "Расскажем, как искать клиентов и как с ними разговаривать." },
          { title: "Бонусы для клиента", text: "Список бонусов, из которых клиент выбирает один для себя." },
        ],
        bar: {
          title: "Требования",
          text: "Опыт продаж, возраст, гражданство и оформление не важны.\nГлавное — желание работать.",
          textMobile: "Опыт, возраст, гражданство и оформление не важны. Главное — желание работать.",
        },
      },
      {
        kind: "apply", id: "apply", title: ["Откликнуться"],
        text: "Заполните форму или напишите нам напрямую. Ответим, расскажем детали и пришлём материалы для старта.",
        note: "Или напишите: +7 747 889-17-49 (звонки и WhatsApp), Telegram @lausardens",
        form: {
          title: "Отклик на вакансию", topic: "Отклик: менеджер по привлечению клиентов",
          fields: [
            { name: "name", label: "Имя" },
            { name: "age", label: "Возраст", type: "number" },
            { name: "contact", label: "Телефон или Telegram" },
          ],
          submit: "Откликнуться", submitMobile: "Откликнуться", ...formCommon,
        },
      },
    ],
  },

  author: {
    title: "Автор коротких видео — The Smich",
    description: "Снимайте ролики с баннером The Smich и получайте деньги за просмотры. Любые площадки, выплаты от 10 000 просмотров.",
    cta: "Откликнуться",
    slides: [
      {
        kind: "title", id: "top", eyebrow: "Вакансия в The Smich",
        title: ["Автор", "коротких", "видео"], titleMobile: ["Автор", "коротких", "видео"],
        text: "Снимайте ролики с баннером The Smich и получайте деньги за просмотры. Любые площадки, выплаты от 10 000 просмотров.",
        size: 130, sizeMobile: 44,
      },
      {
        kind: "cards", id: "how", bg: "smoke", title: ["Как это", "работает"],
        lead: "Без договоров и согласований.\nСняли, набрали просмотры, получили деньги.",
        leadMobile: "Сняли, набрали просмотры, получили деньги.",
        numbered: true, cols: 4, mobileCols: 1,
        items: [
          { title: "Снимаете", text: "Ролик на тему, которая интересна предпринимателям. Формат и подача на ваш вкус." },
          { title: "Ставите баннер", text: "Баннер The Smich виден на протяжении всего ролика. Файлы баннеров дадим." },
          { title: "Набираете просмотры", text: "Публикуете на любой площадке и набираете от 10 000 просмотров.", textMobile: "Публикуете на любой площадке и ждёте от 10 000 просмотров." },
          { title: "Получаете деньги", text: "Присылаете ссылку, мы проверяем статистику и переводим выплату на карту." },
        ],
      },
      {
        kind: "rates", id: "rates", leadWidth: 640, title: ["Сколько", "платим"],
        lead: "Ставка зависит от площадки: просмотры в Instagram для нас ценнее.",
        cards: [
          { title: "Instagram Reels", value: "150 ₸", alt: "или 30 ₽", per: "за 1000 просмотров" },
          { title: "TikTok, YouTube Shorts и другие площадки", titleMobile: "TikTok, Shorts и другие", value: "80 ₸", alt: "или 15 ₽", per: "за 1000 просмотров" },
        ],
        examplesTitle: "Примеры", or: "или",
        examples: [
          { label: "10 000 просмотров в Reels", value: "1 500 ₸", alt: "300 ₽" },
          { label: "50 000 просмотров в Reels", value: "7 500 ₸", alt: "1 500 ₽" },
          { label: "100 000 просмотров в TikTok", value: "8 000 ₸", alt: "1 500 ₽" },
        ],
      },
      {
        kind: "rules", id: "payout", leadWidth: 680, title: ["Как считаем", "выплату"],
        lead: "Например: прислали ролик на 30 000 просмотров, получили выплату. Набрал 40 000 — получите доплату за 10 000.",
        leadMobile: "",
        items: [
          { b: "От 10 000 просмотров", text: "с этого порога ролик можно отправлять на выплату. Максимума нет." },
          { b: "Считаем на момент заявки", text: "чем дольше ждёте, тем больше просмотров и тем больше выплата." },
          { b: "Выплата за ролик разовая", text: "просмотры после заявки не доплачиваем." },
          { b: "Исключение: каждые новые 10 000", text: "если после выплаты ролик набрал ещё полные 10 000 просмотров, можно прислать его снова и получить доплату за них." },
          { b: "Только честные просмотры", text: "проверяем статистику через сервисы аналитики. За накрутку не платим." },
        ],
      },
      {
        kind: "cards", id: "requirements", bg: "mist", title: ["Требования", "к ролику"],
        lead: "Ролики, которые не подходят\nпод требования, не оплачиваем.", leadMobile: "",
        numbered: false, cols: 2, mobileCols: 1,
        items: [
          { title: "Баннер на весь ролик", text: "Баннер The Smich должен быть виден от первой до последней секунды. Текст и упоминание голосом не обязательны." },
          { title: "Тема для предпринимателей", text: "Бизнес, маркетинг, деньги, фриланс, истории компаний — всё, что смотрят те, кому может понадобиться сайт." },
          { title: "Понятно, кто мы", text: "Зритель должен понять, что The Smich делает сайты и продвигает их, и как нас найти." },
          { title: "Любые площадки", text: "Instagram, TikTok, YouTube, VK и другие. Аккаунт ваш, опыт и количество подписчиков не важны." },
        ],
      },
      {
        kind: "apply", id: "apply", title: ["Начать"],
        text: "Напишите нам, чтобы получить баннер. Когда ролик наберёт от 10 000 просмотров, пришлите ссылку через форму.",
        note: "Баннер получите у нас: +7 747 889-17-49 (звонки и WhatsApp), Telegram @lausardens.", noteAbove: true,
        form: {
          title: "Отправить ролик", topic: "Ролик: автор коротких видео",
          fields: [
            { name: "name", label: "Имя" },
            { name: "link", label: "Ссылка на ролик", placeholder: "https://", type: "url" },
            { name: "contact", label: "Телефон или Telegram" },
          ],
          submit: "Отправить", submitMobile: "Отправить ролик", ...formCommon,
        },
      },
    ],
  },
};
