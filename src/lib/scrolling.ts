/**
 * «Сейчас идёт прокрутка» — true во время прокрутки и 150 мс после неё.
 *
 * Пока страница едет под неподвижной мышью, браузер шлёт синтетические
 * mousemove, и эффекты наведения (буквы, наклон карт) начали бы рисовать
 * кадры прямо во время прокрутки. Эффекты спрашивают scrolling() и в это
 * время курсор игнорируют — прокрутке достаётся вся мощность.
 */
let until = 0;
const mark = () => { until = performance.now() + 150; };

// scroll не всплывает, но ловится на window в фазе захвата — у любого элемента
addEventListener("scroll", mark, { capture: true, passive: true });
addEventListener("wheel", mark, { passive: true });

export const scrolling = (): boolean => performance.now() < until;
