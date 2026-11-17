/**
 * Переход к секции из любого места (шапка, меню, кнопки в секциях): nav.go("contacts").
 * Подключает Pager, пока он смонтирован; он же держит список секций (ids)
 * и текущую (current). Смена текущей секции — nav.subscribe (шапка подчёркивает
 * свой пункт меню). Без Pager (политика конфиденциальности) — go ничего не делает.
 */
const subs = new Set<() => void>();
let current = "";

export const nav = {
  go: (_id: string) => {},
  ids: [] as string[],
  get current() { return current; },
  set current(id: string) {
    if (id === current) return;
    current = id;
    subs.forEach(f => f());
  },
  subscribe(f: () => void) {
    subs.add(f);
    return () => { subs.delete(f); };
  },
};
