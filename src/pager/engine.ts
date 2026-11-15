/*
 * Движок полноэкранных секций главной. Без React: всё, что двигается, — Web
 * Animations API (element.animate) по transform/opacity. Такие анимации ведёт
 * композитор браузера в отдельном потоке: экран едет, даже если главный поток на
 * миг занят.
 *
 * ПРАВИЛО ПЕРЕХОДА (решение владельца, действует для всех секций — AGENTS.md,
 * docs/ANIMATIONS.md). Переход A → B, вниз или вверх — зеркально:
 *   1. B приезжает на весь экран; A уезжает медленнее (на LIFT экрана), её фон
 *      ужимается по высоте ровно по краю B — одна граница, без наезда и щели.
 *   2. Контент A едет со скоростью B (а не своего фона) — его «выталкивает».
 *   3. Контент A одновременно разбирается: его анимация появления проигрывается
 *      назад (последний пришедший уходит первым).
 *   4. Контент B собирается на ту же величину перехода.
 * Всё это — ОДНА временная шкала: у всех анимаций перехода одна длительность
 * DURATION, линейное время; кривые — внутри ключевых кадров. Поэтому разборка и
 * сборка точно привязаны к перелистыванию, а жест «назад» посреди перехода
 * просто разворачивает все анимации (reverse) с текущей точки — без скачков.
 *
 * Элементы сборки помечаются data-r="<номер в очереди>" (см. reveal.tsx), строки
 * заголовков под маской — ещё и data-r-line. На элементе с data-r не должно быть
 * своего transform: его перекроет анимация.
 */
import { reducedMotion } from "../lib/media";

export interface EngineSection {
  id: string;
  el: HTMLElement;
  bg: HTMLElement;
  content: HTMLElement;
  /** Тема секции (dark/light/accent) — по ней красится шапка. */
  theme: string;
}

export interface EngineOpts {
  root: HTMLElement;
  sections: EngineSection[];
  start: number;
  /** Секция под шапкой сменилась (на середине перехода) — перекрасить шапку. */
  onTone: (theme: string) => void;
  /** Целевая секция сменилась — индикатор. */
  onIndex: (i: number) => void;
}

/** Длительность перехода, мс. Всё (секции и контент) укладывается в неё. */
export const DURATION = 1000;
/** Кривая движения секций: мягкий разгон, долгое торможение. */
const EASE = "cubic-bezier(.65, 0, .2, 1)";
/** Кривая каждого элемента сборки внутри его окна. */
const ITEM_EASE = "cubic-bezier(.2, .7, .25, 1)";
/** Уходящая секция сдвигается на эту долю экрана, её фон сжимается до неё же. */
const LIFT = 0.85;
/** Сдвиг блока при сборке, px (строки под маской — 110% своей высоты). */
const SHIFT = 90;
/** Окно элемента сборки: доля перехода. Первые стартуют в START, разброс — до SPREAD. */
const START = 0.06, SPREAD = 0.36, WINDOW = 0.58;
/** Первое появление после загрузки — без движения секции, чуть дольше. */
const INTRO = 1300;

interface Run {
  from: number;
  /** Куда придём, если не развернут. */
  target: number;
  anims: Animation[];
  intro: boolean;
  toneTimer: number;
  toneSwitched: boolean;
  /** Жест вперёд во второй половине перехода — следующая секция после этой. */
  queued: number | null;
}

const at = (y: string) => `translate3d(0, ${y}, 0)`;

function revealFrames(el: HTMLElement, i: number, max: number, dir: number): Keyframe[] {
  const line = el.hasAttribute("data-r-line");
  const s = START + (max ? i / max : 0) * Math.min(SPREAD, max * 0.06);
  const e = Math.min(1, s + WINDOW);
  const from: Keyframe = line ? { transform: at(`${dir * 110}%`) } : { transform: at(`${dir * SHIFT}px`), opacity: 0 };
  const to: Keyframe = line ? { transform: at("0") } : { transform: at("0"), opacity: 1 };
  const kf: Keyframe[] = [{ ...from, offset: 0 }, { ...from, offset: s, easing: ITEM_EASE }, { ...to, offset: e }];
  if (e < 1) kf.push({ ...to, offset: 1 });
  return kf;
}

export function createEngine(o: EngineOpts) {
  const S = o.sections;
  let cur = o.start;
  let run: Run | null = null;
  // в момент жеста главный поток должен сделать минимум: элементы сборки, их
  // ключевые кадры и высота экрана готовятся заранее, раскладку не читаем
  let H = o.root.clientHeight;
  const items = S.map(s => [...s.el.querySelectorAll<HTMLElement>("[data-r]")]);
  const frames = new Map<string, Keyframe[][]>();
  const framesOf = (k: number, dir: number) => {
    const key = `${k}:${dir}`;
    if (!frames.has(key)) {
      const idx = items[k].map(el => Number(el.dataset.r) || 0);
      const max = Math.max(0, ...idx);
      frames.set(key, items[k].map((el, j) => revealFrames(el, idx[j], max, dir)));
    }
    return frames.get(key)!;
  };
  const mk = (el: Element, kf: Keyframe[], opts: KeyframeEffectOptions) =>
    new Animation(new KeyframeEffect(el, kf, opts), document.timeline);
  /** Анимации сборки секции k: вперёд (вход) или в обратной перемотке (уход). */
  const reveal = (k: number, dir: number, duration: number, backwards: boolean) => {
    const kf = framesOf(k, dir);
    const opts: KeyframeEffectOptions = { duration, fill: "both", direction: backwards ? "reverse" : "normal" };
    return items[k].map((el, j) => mk(el, kf[j], opts));
  };
  /*
   * Анимации перехода собираются заранее (в покое, см. prepare) и только
   * запускаются в момент жеста: разбор ключевых кадров — самая дорогая часть
   * element.animate(). Анимация после cancel() снова «пустая» — её можно
   * запускать повторно. enter — секция приходит, leave — уходит.
   */
  const built = new Map<string, Animation[]>();
  const anims = (k: number, dir: number, role: "enter" | "leave") => {
    const key = `${k}:${dir}:${role}`;
    let list = built.get(key);
    if (!list) {
      const sec = S[k];
      const opts: KeyframeEffectOptions = { duration: DURATION, fill: "both", easing: EASE };
      list = role === "enter"
        ? [mk(sec.el, [{ transform: at(`${dir * H}px`) }, { transform: at("0") }], opts)]
        : [
          mk(sec.bg, [{ transform: `${at("0")} scale(1, 1)` }, { transform: `${at(`${-dir * LIFT * H}px`)} scale(1, ${LIFT})` }], opts),
          mk(sec.content, [{ transform: at("0") }, { transform: at(`${-dir * H}px`) }], opts),
        ];
      list.push(...reveal(k, dir, DURATION, role === "leave"));
      built.set(key, list);
    }
    return list;
  };
  /** Высота экрана сменилась — собранные анимации устарели (пересоберутся в покое). */
  let stale = false;

  /** Видимость (дёшево, в момент жеста) и доступность для Tab (inert — только в покое). */
  const show = (k: number, on: boolean, settled = true) => {
    const el = S[k].el;
    el.toggleAttribute("data-on", on);
    if (settled) el.inert = !on;
  };

  /*
   * Соседи наготове. Пока экран стоит, секции cur±1 уже отрисованы и лежат за
   * краем экрана (над и под ним) со своими слоями (will-change в Pager.module.css).
   * Тогда в момент жеста браузеру не нужно впервые рисовать новую секцию и
   * создавать слои для элементов сборки — главный поток только запускает
   * анимации. Готовим с паузой после перехода: на неподвижном экране заминка не видна.
   */
  let nearTimer = 0;
  const placeNear = () => {
    S.forEach((s, k) => {
      const near = Math.abs(k - cur) === 1;
      s.el.toggleAttribute("data-near", near);
      s.el.style.transform = near ? at(`${Math.sign(k - cur) * H}px`) : "";
    });
  };
  const prepare = () => {
    clearTimeout(nearTimer);
    nearTimer = window.setTimeout(() => {
      if (run) return;
      if (stale) { built.clear(); stale = false; }
      placeNear();
      // собрать анимации ближайших переходов: текущая уходит вверх/вниз, соседи приходят
      for (const d of [1, -1]) {
        if (S[cur + d]) { anims(cur, d, "leave"); anims(cur + d, d, "enter"); }
      }
    }, 120);
  };

  const settle = (target: number) => {
    const queued = run?.queued ?? null;
    S[target].el.style.transform = ""; // мог лежать за краем экрана как сосед
    if (run) {
      clearTimeout(run.toneTimer);
      // после reverse() скорость −1 — вернуть, чтобы анимацию можно было запустить снова
      run.anims.forEach(a => { a.cancel(); if (a.playbackRate !== 1) a.playbackRate = 1; });
    }
    run = null;
    cur = target;
    S.forEach((s, k) => { show(k, k === target); s.el.style.zIndex = ""; if (k === target) s.el.removeAttribute("data-near"); });
    prepare();
    o.onTone(S[target].theme);
    o.onIndex(target);
    const id = S[target].id;
    history.replaceState(null, "", target === 0 ? location.pathname + location.search : `#${id}`);
    if (queued !== null && queued !== target) go(queued);
  };

  const begin = (from: number, to: number) => {
    clearTimeout(nearTimer);
    if (stale) { built.clear(); stale = false; }
    const A = S[from], B = S[to];
    const dir = to > from ? 1 : -1;
    B.el.style.zIndex = "2";
    A.el.style.zIndex = "1";
    show(to, true, false);
    A.bg.style.transformOrigin = dir > 0 ? "50% 0" : "50% 100%";
    const list = [...anims(to, dir, "enter"), ...anims(from, dir, "leave")];
    list.forEach(a => a.play());
    const r: Run = { from, target: to, anims: list, intro: false, toneTimer: 0, toneSwitched: false, queued: null };
    // шапка и индикатор меняются на середине — когда граница секций проходит под шапкой
    // (и чтобы в кадр жеста не попадала лишняя перерисовка)
    r.toneTimer = window.setTimeout(() => { r.toneSwitched = true; o.onTone(B.theme); o.onIndex(to); }, DURATION / 2);
    list[0].onfinish = () => { if (run === r) settle(r.target); };
    run = r;
  };

  /** Развернуть текущий переход назад с той же точки. */
  const reverse = () => {
    const r = run!;
    const t = Number(r.anims[0].currentTime) || 0;
    r.anims.forEach(a => a.reverse());
    [r.from, r.target] = [r.target, r.from];
    r.queued = null;
    clearTimeout(r.toneTimer);
    if (r.toneSwitched) {
      // шапка уже перекрасилась — вернуть цвет, когда граница снова пройдёт середину
      r.toneTimer = window.setTimeout(() => {
        r.toneSwitched = false; o.onTone(S[r.target].theme); o.onIndex(r.target);
      }, Math.max(0, t - DURATION / 2));
    }
  };

  function go(to: number) {
    to = Math.max(0, Math.min(S.length - 1, to));
    if (run?.intro) { run.anims.forEach(a => a.cancel()); run = null; } // естественный стиль = конец появления
    if (!run) clearTimeout(nearTimer);
    if (run) {
      if (to === run.from) return reverse();
      if (to !== run.target) {
        // вперёд посреди перехода: только во второй половине, иначе один жест листал бы две секции
        const p = (Number(run.anims[0].currentTime) || 0) / DURATION;
        if (p > 0.5) run.queued = to;
      }
      return;
    }
    if (to === cur) return;
    if (reducedMotion()) { settle(to); return; }
    begin(cur, to);
  }

  /** Шаг вперёд/назад от того, куда сейчас едем. */
  const step = (dir: number) => go((run ? run.target : cur) + dir);

  /**
   * Прогрев («экран загрузки» как в играх): несколько кадров все секции
   * рисуются поверх почти прозрачными — браузер заранее растрирует шрифты и слои,
   * и первый заход в каждую секцию не даёт заминки. Затем — первое появление.
   */
  const startUp = (onReady: () => void) => {
    S.forEach((_, k) => show(k, k === cur));
    addEventListener("resize", onResize);
    o.onTone(S[cur].theme);
    o.onIndex(cur);
    const afterFrames = (n: number, fn: () => void): void => { requestAnimationFrame(() => (n > 1 ? afterFrames(n - 1, fn) : fn())); };
    S.forEach((s, k) => { if (k !== cur) s.el.setAttribute("data-warm", ""); });
    afterFrames(3, () => {
      S.forEach(s => s.el.removeAttribute("data-warm"));
      if (reducedMotion()) { onReady(); prepare(); return; }
      const intro = reveal(cur, 1, INTRO, false);
      intro.forEach(a => a.play());
      onReady(); // контент становится видимым — анимации уже держат начальную позу
      if (!intro.length) { prepare(); return; }
      const r: Run = { from: cur, target: cur, anims: intro, intro: true, toneTimer: 0, toneSwitched: false, queued: null };
      intro[0].onfinish = () => { if (run === r) { intro.forEach(a => a.cancel()); run = null; prepare(); } };
      run = r;
    });
  };

  function onResize() {
    H = o.root.clientHeight;
    stale = true;
    if (!run) prepare();
  }

  return {
    go,
    step,
    startUp,
    running: () => !!run && !run.intro,
    index: () => (run ? run.target : cur),
    destroy() {
      removeEventListener("resize", onResize);
      clearTimeout(nearTimer);
      if (run) { clearTimeout(run.toneTimer); run.anims.forEach(a => a.cancel()); }
      run = null;
    },
  };
}

export type Engine = ReturnType<typeof createEngine>;
