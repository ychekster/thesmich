import { about } from "../../content/home";
import { Lines, r } from "../../pager/reveal";
import ui from "../ui.module.css";
import s from "./About.module.css";

/** О студии: заявление и три направления работы. */
export function About() {
  return (
    <div className={s.about}>
      <div className={s.head}>
        <p className={ui.eyebrow} {...r(0)}>{about.eyebrow}</p>
        <Lines lines={about.title} className={ui.title} from={1} />
        <p className={ui.lead} {...r(3)}>{about.lead}</p>
      </div>
      <ul className={s.points}>
        {about.points.map((p, k) => (
          <li key={p.n} className={s.point} {...r(4 + k)}>
            <span className={s.n}>{p.n}</span>
            <h3 className={s.h}>{p.title}</h3>
            <p className={s.t}>{p.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
