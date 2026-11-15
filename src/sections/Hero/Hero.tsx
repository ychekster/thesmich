import { hero } from "../../content/home";
import { site } from "../../content/site";
import { nav } from "../../pager/nav";
import { Lines, r } from "../../pager/reveal";
import ui from "../ui.module.css";
import s from "./Hero.module.css";

/** Приветствие: крупный заголовок по центру и одна кнопка — заявка. */
export function Hero() {
  return (
    <div className={s.hero}>
      <p className={ui.eyebrow} {...r(0)}>{hero.eyebrow}</p>
      <Lines as="h1" lines={hero.title} className={`${ui.title} ${s.title}`} from={1} />
      <p className={`${ui.lead} ${s.lead}`} {...r(3)}>{hero.lead}</p>
      <div className={s.cta} {...r(4)}>
        <button className={ui.btn} type="button" onClick={() => nav.go("contacts")}>{site.cta}</button>
      </div>
    </div>
  );
}
