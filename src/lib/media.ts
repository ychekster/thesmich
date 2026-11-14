/** Устройство с мышью: эффекты наведения (буквы, наклон карт) включаем только на нём. */
export const finePointer = () => matchMedia("(hover: hover) and (pointer: fine)").matches;

/** Пользователь попросил систему не анимировать интерфейс. */
export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
