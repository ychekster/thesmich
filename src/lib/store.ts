import { useSyncExternalStore } from "react";
import type { TopicId } from "../content/home";

/**
 * Маленькое общее состояние между секциями (колесо → форма, «Вакансии» → форма).
 * Не через стейт App: так меняется только та секция, которая это читает, а не вся
 * главная (перерисовка всех секций — риск фриза).
 */
interface State {
  /** Последний выпавший бонус колеса (полный текст) или null. */
  bonus: string | null;
  /** Тема заявки: нужен сайт / хочу в партнёры. */
  topic: TopicId;
}

let state: State = { bonus: null, topic: "site" };
const subs = new Set<() => void>();

export const store = {
  get: () => state,
  set(patch: Partial<State>) {
    state = { ...state, ...patch };
    subs.forEach(f => f());
  },
  subscribe(f: () => void) {
    subs.add(f);
    return () => { subs.delete(f); };
  },
};

export function useStore<T>(pick: (s: State) => T): T {
  return useSyncExternalStore(store.subscribe, () => pick(state));
}
