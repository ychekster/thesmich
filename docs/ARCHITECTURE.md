# Архитектура

Имиджевый сайт студии The Smich (Казахстан): полноэкранные секции, в конце —
контакты и форма заявки. План секций — `docs/PLAN.md`.
Кроме главной — страницы-визитки команды `/yarik/` и `/emir/`.

Сайт переписан с нуля 2026-11-15 (ветка `redesign`) ради безупречной плавности.
Старая версия (анкета, FAQ-карты, WebGL) — в истории git, ветка `fullscreen-sections`.

## Стек

- **Vite** — сборка и dev-сервер (`npm run dev` → http://localhost:5173).
- **React 19 + TypeScript** (strict). React рисует страницу один раз; всё, что
  двигается, — мимо React.
- **Web Animations API** (`new Animation(new KeyframeEffect(...))`) — переходы
  секций и сборка контента; ведёт композитор браузера. Без библиотек анимации.
- **CSS Modules** — у каждого компонента свой `*.module.css`; токены — в
  `src/styles/global.css`. Никаких UI-китов.
- **qrcode-generator** — QR на обороте визитки (SVG-путь).
- **@fontsource/inter** — шрифт в проекте, без запросов к Google.

Серверной части нет. Заявка уходит POST-запросом (JSON) на `VITE_LEAD_ENDPOINT`
(см. `.env.example`); без него — только `console.log`.

## Структура

```
index.html               главная (точка входа src/main.tsx)
yarik/, emir/index.html  визитки (src/person.tsx, чья — data-person у #root); список — vite.config.ts
public/                  статика (favicon.svg; фото визиток — public/team/)
src/
├── main.tsx, App.tsx    главная: шапка + Pager; список секций (порядок, якоря, фоны, темы)
├── person.tsx           монтирование визитки
├── content/             ВСЕ тексты
│   ├── site.ts          бренд, контакты, кнопка заявки
│   ├── home.ts          тексты всех секций главной (кроме колеса)
│   ├── wheel.ts         колесо фортуны: бонусы и подписи
│   └── team.ts          визитки: люди, контакты, подписи
├── pager/               движок полноэкранных секций
│   ├── engine.ts        переходы и сборка контента (Web Animations), соседи наготове
│   ├── input.ts         колесо, тачпад, свайп, клавиши → engine
│   ├── Pager.tsx        разметка секций, индикатор слева, связь с движком
│   ├── reveal.tsx       r(i) — элемент сборки; <Lines> — заголовок из строк под маской
│   ├── nav.ts           nav.go("contacts") — переход из любого места
│   └── Pager.module.css раскладка секций, фоны (.bg_*), индикатор
├── sections/            секции главной: Hero, About, Sites, Channels, Promo, Wheel,
│   │                    Partners, Contacts — у каждой .tsx + .module.css
│   └── ui.module.css    общая типографика: надзаголовок, заголовок, вводный текст, кнопка
├── components/Header/   шапка: логотип и «Оставить заявку»
├── team/                визитка: TeamCard (CSS-3D, наклон, блик, переворот),
│                        contact.ts (vCard, строки контактов, QR), PersonPage
├── lib/
│   ├── lead.ts          отправка заявки
│   ├── store.ts         общее состояние секций: бонус колеса, тема заявки
│   └── media.ts         «есть мышь», «без анимаций»
└── styles/global.css    токены, темы секций (.theme-light / .theme-accent), сброс
docs/                    PLAN.md, ARCHITECTURE.md, ANIMATIONS.md, CONTENT.md, IDEAS.md
```

## Главная

Секции на весь экран, **без промежуточной прокрутки**: колесо, тачпад, свайп,
стрелки/PageUp/PageDown/пробел/Home/End — сразу следующая секция. Правило перехода —
`AGENTS.md`, устройство — `docs/ANIMATIONS.md`.

| # | id | Секция | Фон | Тема |
|---|----|--------|-----|------|
| 1 | `top` | Приветствие (`Hero`) | `ink` | dark |
| 2 | `about` | О студии | `paper` | light |
| 3 | `sites` | Какие сайты делаем | `graphite` | dark |
| 4 | `channels` | Каналы продвижения | `red` | accent |
| 5 | `promo` | Промо-ролик | `black` | dark |
| 6 | `bonus` | Колесо фортуны | `sand` | light |
| 7 | `partners` | Вакансии (60%) | `night` | dark |
| 8 | `contacts` | Контакты + форма | `coal` | dark |

- **Якоря**: `/#contacts` открывает сразу секцию; ссылка `#id` на странице листает
  к ней; адрес обновляется после перехода (`history.replaceState`).
- **Тема** секции (`theme-dark/light/accent`) переопределяет токены текста — компоненты
  на токенах перекрашиваются сами. Шапка и индикатор красятся по `html[data-tone]`,
  его ставит движок на середине перехода.
- **Контент должен влезать в экран** на компьютере (размеры от высоты: `svh`, `clamp`).
  На телефоне невлезающее прокручивается внутри секции, переход — когда упёрлись в край.
- Неактивные секции — `inert` (Tab не уводит за экран).
- **Связь секций** — `lib/store.ts`, не стейт App: колесо → бонус в форме,
  «Вакансии» → тема «Хочу в партнёры». App не перерисовывается никогда.
- Кнопки «Оставить заявку» (шапка, первый экран, колесо) — `nav.go("contacts")`.

## Где что менять — быстрый указатель

| Задача | Файл |
|--------|------|
| План сайта, какие секции | `docs/PLAN.md` |
| Тексты секций | `src/content/home.ts` (см. docs/CONTENT.md) |
| Контакты, бренд | `src/content/site.ts` |
| Бонусы колеса | `src/content/wheel.ts` |
| Порядок секций, якоря, фон и тема секции | `pages` в `src/App.tsx` |
| Цвета фонов секций | `.bg_*` в `src/pager/Pager.module.css` |
| Акцент, токены, темы | `src/styles/global.css` |
| Типографика секций (заголовки, кнопки) | `src/sections/ui.module.css` |
| Вёрстка конкретной секции | `src/sections/<Имя>/` |
| Новая секция | компонент в `src/sections/`, тексты в `content/home.ts`, строка в `pages` (`App.tsx`); элементы — `r(i)`/`<Lines>` |
| Переход: длительность, кривая, ужатие фона, сдвиг сборки | константы вверху `src/pager/engine.ts` |
| Чувствительность колеса/свайпа | константы вверху `src/pager/input.ts` |
| Индикатор слева | `Pager.tsx` + `.meter` в `Pager.module.css` |
| Шапка | `src/components/Header/` |
| Высота шапки, боковые поля | `--header`, `--x` в `global.css` |
| Колесо: вид, длительность | `src/sections/Wheel/` (`SPIN_MS` + transition в css) |
| Промо-ролик | `promo.youtubeId` в `content/home.ts` |
| Форма заявки | `src/sections/Contacts/`, отправка — `src/lib/lead.ts` |
| Куда уходит заявка | `.env` → `VITE_LEAD_ENDPOINT` |
| Визитки: имена, фото, контакты | `src/content/team.ts` |
| Визитки: вид, наклон, блик | `src/team/TeamCard.module.css`, `TeamCard.tsx` |
| Новая визитка | `team.ts` + папка `<slug>/index.html` + `vite.config.ts` |
| Идеи на будущее | `docs/IDEAS.md` |
