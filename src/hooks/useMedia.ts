import { useEffect, useState } from "react";

/** Совпадает ли медиазапрос сейчас; обновляется при смене (поворот, ресайз окна). */
export function useMedia(query: string) {
  const [match, setMatch] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const mq = matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return match;
}

/** Брейкпоинт телефона — тот же, что в CSS (`max-width: 760px`). */
export const PHONE = "(max-width: 760px)";
