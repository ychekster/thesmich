import { hero } from "../../content/home";
import { Lines, r } from "../../pager/reveal";
import ui from "../ui.module.css";
import s from "./Hero.module.css";

/** Приветствие: огромный заголовок Bebas Neue, подзаголовок и красный уголок экрана. */
export function Hero() {
  return (
    <div className={s.hero}>
      <h1 className={s.title}>
        <Lines as="span" lines={hero.title} />
      </h1>
      <div className={s.text}>
        <p className={`${ui.tagline} ${ui.desktop}`} {...r(3)}>{hero.tagline}</p>
        <p className={`${ui.body} ${s.lead} ${ui.desktop}`} {...r(4)}>{hero.lead}</p>
        <p className={`${ui.tagline} ${s.taglineMobile} ${ui.mobile}`} {...r(3)}>{hero.taglineMobile}</p>
      </div>
      <span className={s.corner} aria-hidden="true" />
    </div>
  );
}
