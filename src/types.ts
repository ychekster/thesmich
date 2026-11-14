/** Вариант ответа в вопросе анкеты. */
export interface Option {
  /** Текст варианта — он же уходит в заявку. */
  v: string;
  /** Подпись справа (на телефоне скрыта). */
  d?: string;
  /** Исключающий вариант («Пока ничего»): снимает остальные отметки. */
  only?: boolean;
  /** «Свой вариант»: строка превращается в поле ввода. */
  own?: boolean;
}

interface QuestionBase {
  /** Ключ ответа в заявке. */
  id: string;
  title: string;
  hint?: string;
}

export interface ChoiceQuestion extends QuestionBase {
  /** single — один ответ, переход дальше сразу после выбора; multi — несколько. */
  type: "single" | "multi";
  options: Option[];
  /** Варианты в две колонки. */
  cols?: boolean;
}

export interface ContactQuestion extends QuestionBase {
  type: "contact";
}

export type Question = ChoiceQuestion | ContactQuestion;

/** Ответ на вопрос с вариантами: выбранные индексы и текст «своего варианта». */
export interface ChoiceAnswer {
  picked: number[];
  own: string;
}

export interface Contacts {
  name: string;
  phone: string;
  email: string;
}

export interface FaqCard {
  suit: "♠" | "♥" | "♣" | "♦";
  q: string;
  a: string;
}
